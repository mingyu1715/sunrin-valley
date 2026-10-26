"""Budget safety contracts; all AWS calls terminate at an in-memory fake."""

import contextlib
import copy
import io
import json
import subprocess
import unittest
from datetime import datetime, timezone
from unittest.mock import patch

import budgets


EMAIL = "recipient@example.com"
RATE = "1324.4527829893684"
NOW = datetime(2026, 10, 26, 3, 0, tzinfo=timezone.utc)


def existing_budget():
    return {
        "BudgetName": "SunrinValley-Test-KRW10000",
        "BudgetType": "COST",
        "TimeUnit": "MONTHLY",
        "BudgetLimit": {"Amount": "7.55", "Unit": "USD"},
        "TimePeriod": {"Start": 1790812800, "End": 3706473600},
        "CostFilters": {},
        "CostTypes": {
            "IncludeTax": True,
            "IncludeSubscription": True,
            "UseBlended": False,
            "IncludeRefund": False,
            "IncludeCredit": False,
            "IncludeUpfront": True,
            "IncludeRecurring": True,
            "IncludeOtherSubscription": True,
            "IncludeSupport": True,
            "IncludeDiscount": True,
            "UseAmortized": False,
        },
    }


def existing_notifications():
    return [
        {
            "NotificationType": "ACTUAL",
            "ComparisonOperator": "GREATER_THAN",
            "Threshold": threshold,
            "ThresholdType": "PERCENTAGE",
            "NotificationState": "OK",
        }
        for threshold in (30, 80, 100)
    ]


class FakeAws:
    def __init__(self, budget=None, contacts=None, subscribers=None):
        self.budget = budget
        self.contacts = [] if contacts is None else contacts
        self.subscribers = subscribers
        self.calls = []
        self.created = None

    def call(self, service, operation, *arguments):
        self.calls.append((service, operation, arguments))
        if (service, operation) == ("sts", "get-caller-identity"):
            return {"Account": "123456789012", "Arn": "arn:aws:iam::123456789012:root"}
        if operation == "describe-budget":
            if self.budget is None:
                raise budgets.AwsCliError(service, operation, "NotFoundException")
            return {"Budget": copy.deepcopy(self.budget)}
        if operation == "describe-notifications-for-budget":
            return {"Notifications": existing_notifications()}
        if operation == "describe-subscribers-for-notification":
            return {"Subscribers": self.subscribers or [{"SubscriptionType": "EMAIL", "Address": EMAIL}]}
        if operation == "list-email-contacts":
            return {"emailContacts": copy.deepcopy(self.contacts)}
        if operation == "create-budget":
            self.created = {
                "budget": json.loads(arguments[arguments.index("--budget") + 1]),
                "notifications": json.loads(arguments[arguments.index("--notifications-with-subscribers") + 1]),
            }
            return {}
        raise AssertionError((service, operation))


class BudgetContracts(unittest.TestCase):
    def plan(self):
        return budgets.build_plan(EMAIL, RATE, NOW)

    def test_plan_derives_decimal_usd_thresholds_and_utc_month_start(self):
        plan = self.plan()
        self.assertEqual(plan["budget"]["BudgetLimit"], {"Amount": "7.55", "Unit": "USD"})
        self.assertEqual(plan["budget"]["TimePeriod"]["Start"], 1790812800)
        self.assertEqual(plan["reference"]["date"], "2026-10-23")
        self.assertEqual(plan["reference"]["krw_per_usd"], RATE)
        self.assertEqual([row["Notification"]["Threshold"] for row in plan["notifications"]], [30, 80, 100])
        for row in plan["notifications"]:
            self.assertEqual(row["Notification"]["NotificationType"], "ACTUAL")
            self.assertEqual(row["Notification"]["ComparisonOperator"], "GREATER_THAN")
            self.assertEqual(row["Notification"]["ThresholdType"], "PERCENTAGE")
            self.assertEqual(row["Subscribers"], [{"SubscriptionType": "EMAIL", "Address": EMAIL}])
        self.assertFalse(plan["budget"]["CostTypes"]["IncludeCredit"])
        self.assertFalse(plan["budget"]["CostTypes"]["IncludeRefund"])
        self.assertTrue(plan["budget"]["CostTypes"]["IncludeTax"])
        self.assertFalse(plan["budget"].get("CostFilters"))

    def test_invalid_exchange_rate_or_email_cannot_make_a_plan(self):
        for rate in ("0", "-1", "NaN", "Infinity", "invalid"):
            with self.subTest(rate=rate), self.assertRaises(ValueError):
                budgets.build_plan(EMAIL, rate, NOW)
        with self.assertRaises(ValueError):
            budgets.build_plan("recipient@example.com\nother@example.com", RATE, NOW)

    def test_default_cli_only_prints_plan_without_even_reading_aws(self):
        output = io.StringIO()
        with patch.object(subprocess, "run", side_effect=AssertionError("AWS must not run")), contextlib.redirect_stdout(output):
            code = budgets.main(["--profile", "test", "--email", EMAIL, "--reference-krw-per-usd", RATE])
        result = json.loads(output.getvalue())
        self.assertEqual(code, 0)
        self.assertEqual(result["status"], "plan")
        self.assertFalse(result["applied"])

    def test_verify_missing_budget_does_not_create_and_does_not_claim_email_active(self):
        aws = FakeAws()
        result = budgets.execute(self.plan(), aws, verify_only=True)
        self.assertEqual(result["status"], "missing")
        self.assertEqual(result["email_contact_status"], "missing")
        self.assertIsNone(aws.created)
        self.assertNotIn("123456789012", json.dumps(result))

    def test_existing_budget_drift_is_never_overwritten(self):
        remote = existing_budget()
        remote["BudgetLimit"]["Amount"] = "500"
        aws = FakeAws(budget=remote)
        with self.assertRaises(budgets.BudgetDrift):
            budgets.execute(self.plan(), aws)
        self.assertIsNone(aws.created)
        self.assertFalse(any(operation.startswith(("update", "delete", "create")) for _, operation, _ in aws.calls))

    def test_live_aws_two_decimal_budget_storage_is_idempotent(self):
        remote = existing_budget()
        remote["BudgetLimit"]["Amount"] = "7.55"
        result = budgets.execute(self.plan(), FakeAws(budget=remote))
        self.assertEqual(result["status"], "unchanged")
        self.assertEqual(result["usd_budget_amount"], "7.55")

    def test_one_cent_budget_difference_still_requires_review(self):
        remote = existing_budget()
        remote["BudgetLimit"]["Amount"] = "7.54"
        with self.assertRaises(budgets.BudgetDrift):
            budgets.execute(self.plan(), FakeAws(budget=remote))

    def test_existing_scoped_budget_is_not_mistaken_for_account_wide_budget(self):
        remote = existing_budget()
        remote["CostFilters"] = {"Service": ["Amazon Elastic Compute Cloud - Compute"]}
        aws = FakeAws(budget=remote)
        with self.assertRaises(budgets.BudgetDrift):
            budgets.execute(self.plan(), aws)
        self.assertIsNone(aws.created)

    def test_existing_same_budget_is_idempotent_and_inactive_contact_stays_inactive(self):
        aws = FakeAws(budget=existing_budget(), contacts=[{"address": EMAIL, "status": "inactive"}])
        result = budgets.execute(self.plan(), aws)
        self.assertEqual(result["status"], "unchanged")
        self.assertEqual(result["email_contact_status"], "inactive")
        self.assertFalse(result["applied"])
        self.assertIsNone(aws.created)

    def test_existing_other_recipient_is_drift_without_disclosing_the_address(self):
        aws = FakeAws(budget=existing_budget(), subscribers=[{"SubscriptionType": "EMAIL", "Address": "unknown@example.net"}])
        with self.assertRaises(budgets.BudgetDrift) as caught:
            budgets.execute(self.plan(), aws)
        self.assertNotIn("unknown@example.net", str(caught.exception))
        self.assertIsNone(aws.created)

    def test_create_uses_exact_budget_payload_and_leaves_missing_contact_unverified(self):
        aws = FakeAws()
        result = budgets.execute(self.plan(), aws)
        self.assertEqual(result["status"], "created")
        self.assertTrue(result["applied"])
        self.assertEqual(result["email_contact_status"], "missing")
        self.assertEqual(aws.created["budget"]["BudgetLimit"], {"Amount": "7.55", "Unit": "USD"})
        self.assertEqual(len(aws.created["notifications"]), 3)
        self.assertNotIn("123456789012", json.dumps(result))
        self.assertNotIn("arn:aws:iam", json.dumps(result))

    def test_account_wide_contacts_only_mark_matching_active_address_active(self):
        aws = FakeAws(budget=existing_budget(), contacts=[{"address": "other@example.org", "status": "active"}])
        self.assertEqual(budgets.execute(self.plan(), aws)["email_contact_status"], "missing")
        aws.contacts.append({"address": EMAIL, "status": "active"})
        self.assertEqual(budgets.execute(self.plan(), aws)["email_contact_status"], "active")

    def test_existing_monthly_budget_remains_idempotent_next_month(self):
        aws = FakeAws(budget=existing_budget())
        november = budgets.build_plan(EMAIL, RATE, datetime(2026, 11, 2, tzinfo=timezone.utc))
        self.assertEqual(budgets.execute(november, aws)["status"], "unchanged")

    def test_aws_double_threshold_values_are_equivalent_to_integer_thresholds(self):
        class DoubleThresholds(FakeAws):
            def call(self, service, operation, *arguments):
                result = super().call(service, operation, *arguments)
                if operation == "describe-notifications-for-budget":
                    for row in result["Notifications"]:
                        row["Threshold"] = float(row["Threshold"])
                return result

        self.assertEqual(budgets.execute(self.plan(), DoubleThresholds(budget=existing_budget()))["status"], "unchanged")

    def test_aws_failure_output_never_exposes_raw_identity_or_credentials(self):
        private_output = "An error occurred (AccessDenied) when calling the GetCallerIdentity operation: arn:aws:iam::123456789012:root TOKEN-SECRET"
        completed = subprocess.CompletedProcess([], 1, stdout="123456789012", stderr=private_output)
        with patch.object(subprocess, "run", return_value=completed):
            with self.assertRaises(budgets.AwsCliError) as caught:
                budgets.AwsCli("test").call("sts", "get-caller-identity")
        self.assertEqual(caught.exception.code, "AccessDenied")
        self.assertNotIn("123456789012", str(caught.exception))
        self.assertNotIn("TOKEN-SECRET", str(caught.exception))

    def test_contact_api_failure_is_unavailable_rather_than_active(self):
        class DeniedContacts(FakeAws):
            def call(self, service, operation, *arguments):
                if service == "notificationscontacts":
                    raise budgets.AwsCliError(service, operation, "AccessDeniedException")
                return super().call(service, operation, *arguments)

        result = budgets.execute(self.plan(), DeniedContacts(budget=existing_budget()))
        self.assertEqual(result["email_contact_status"], "unavailable")
        self.assertEqual(result["email_contact_error"], "AccessDeniedException")

    def test_budget_read_denied_is_never_interpreted_as_missing(self):
        class DeniedBudget(FakeAws):
            def call(self, service, operation, *arguments):
                if operation == "describe-budget":
                    raise budgets.AwsCliError(service, operation, "AccessDeniedException")
                return super().call(service, operation, *arguments)

        aws = DeniedBudget()
        with self.assertRaises(budgets.AwsCliError):
            budgets.execute(self.plan(), aws)
        self.assertIsNone(aws.created)

    def test_aws_cli_uses_argument_vector_and_disables_interactive_prompt(self):
        completed = subprocess.CompletedProcess([], 0, stdout="{}", stderr="")
        with patch.object(subprocess, "run", return_value=completed) as run:
            budgets.AwsCli("test-profile").call("notificationscontacts", "list-email-contacts")
        command = run.call_args.args[0]
        self.assertIsInstance(command, list)
        self.assertEqual(command[:6], ["aws", "--profile", "test-profile", "--region", "us-east-1", "--output"])
        self.assertEqual(command[-2:], ["notificationscontacts", "list-email-contacts"])
        self.assertFalse(run.call_args.kwargs.get("shell", False))
        self.assertEqual(run.call_args.kwargs["env"]["AWS_CLI_AUTO_PROMPT"], "off")

    def test_apply_cli_error_is_safe_json_without_raw_identity(self):
        completed = subprocess.CompletedProcess([], 1, stdout="", stderr="An error occurred (AccessDenied) when calling the GetCallerIdentity operation: 123456789012 TOKEN-SECRET")
        output = io.StringIO()
        with patch.object(subprocess, "run", return_value=completed), contextlib.redirect_stdout(output):
            code = budgets.main(["--profile", "test", "--email", EMAIL, "--reference-krw-per-usd", RATE, "--apply"])
        result = json.loads(output.getvalue())
        self.assertEqual(code, 1)
        self.assertEqual(result["status"], "error")
        self.assertNotIn("123456789012", output.getvalue())
        self.assertNotIn("TOKEN-SECRET", output.getvalue())


if __name__ == "__main__":
    unittest.main()
