#!/usr/bin/env python3
"""Plan or create the fixed Sunrin test budget through the installed AWS CLI.

Default execution is entirely local. --apply may create a budget and cause AWS
to send the recipient its verification email. Existing settings are never edited.
"""

import argparse
import json
import os
import re
import subprocess
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation, ROUND_DOWN, localcontext


BUDGET_NAME = "SunrinValley-Test-KRW10000"
REFERENCE_DATE = "2026-10-23"
REFERENCE_SOURCE = "https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml"
DEFAULT_END = 3706473600  # AWS's default open-ended budget end (2087-06-15).


class AwsCliError(RuntimeError):
    """Deliberately excludes command arguments and raw AWS stdout/stderr."""

    def __init__(self, service, operation, code):
        self.code = code if re.fullmatch(r"[A-Za-z][A-Za-z0-9_.-]{0,79}", code) else "RequestFailed"
        super().__init__(f"AWS {service} {operation} failed ({self.code}).")


class BudgetDrift(RuntimeError):
    def __init__(self, differences):
        self.differences = sorted(set(differences))
        super().__init__("Existing budget needs review: " + ", ".join(self.differences))


class AwsCli:
    def __init__(self, profile):
        self.profile = profile

    def call(self, service, operation, *arguments):
        command = [
            "aws", "--profile", self.profile, "--region", "us-east-1",
            "--output", "json", "--no-cli-pager", service, operation, *arguments,
        ]
        environment = os.environ.copy()
        environment.update(AWS_PAGER="", AWS_CLI_AUTO_PROMPT="off")
        try:
            result = subprocess.run(
                command, capture_output=True, text=True, timeout=60,
                check=False, env=environment,
            )
        except subprocess.TimeoutExpired:
            raise AwsCliError(service, operation, "Timeout") from None
        except OSError:
            raise AwsCliError(service, operation, "ExecutableUnavailable") from None
        if result.returncode:
            match = re.search(r"An error occurred \(([A-Za-z0-9_.-]+)\)", result.stderr)
            raise AwsCliError(service, operation, match.group(1) if match else "RequestFailed")
        try:
            value = json.loads(result.stdout) if result.stdout.strip() else {}
        except (ValueError, TypeError):
            raise AwsCliError(service, operation, "InvalidJsonResponse") from None
        if not isinstance(value, dict):
            raise AwsCliError(service, operation, "InvalidJsonResponse")
        return value


def build_plan(email, reference_krw_per_usd, now=None):
    if not isinstance(email, str) or len(email) > 254 or not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", email):
        raise ValueError("Provide one valid recipient email address.")
    rate_text = str(reference_krw_per_usd)
    if len(rate_text) > 80 or not re.fullmatch(r"[0-9]+(?:\.[0-9]+)?", rate_text):
        raise ValueError("Reference exchange rate must be a positive finite decimal.")
    try:
        rate = Decimal(rate_text)
        if not rate.is_finite() or rate <= 0:
            raise ValueError("Reference exchange rate must be a positive finite decimal.")
        with localcontext() as context:
            context.prec = 120
            # Budgets stores USD limits at cent precision; plan that same amount
            # so its read-back comparison remains exact and repeatable.
            amount = (Decimal(10000) / rate).quantize(Decimal("0.01"), rounding=ROUND_DOWN)
        if amount <= 0:
            raise ValueError("Reference exchange rate produces a zero budget.")
    except InvalidOperation:
        raise ValueError("Reference exchange rate cannot be represented safely.") from None
    now = now or datetime.now(timezone.utc)
    if now.tzinfo is None:
        raise ValueError("Budget date must include its time zone.")
    start = now.astimezone(timezone.utc).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    return {
        "status": "plan",
        "applied": False,
        "reference": {"date": REFERENCE_DATE, "krw_per_usd": rate_text, "source": REFERENCE_SOURCE},
        "cost_basis": "All account costs before credits and refunds; includes taxes and discounts.",
        "notice": "KRW amounts are approximate at the fixed reference rate. AWS invoice FX differs; delayed alerts are not a spending cap. New email recipients require verification.",
        "budget": {
            "BudgetName": BUDGET_NAME,
            "BudgetType": "COST",
            "TimeUnit": "MONTHLY",
            "TimePeriod": {"Start": int(start.timestamp())},
            "BudgetLimit": {"Amount": format(amount, "f"), "Unit": "USD"},
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
        },
        "notifications": [
            {
                "Notification": {
                    "NotificationType": "ACTUAL", "ComparisonOperator": "GREATER_THAN",
                    "Threshold": threshold, "ThresholdType": "PERCENTAGE",
                },
                "Subscribers": [{"SubscriptionType": "EMAIL", "Address": email}],
            }
            for threshold in (30, 80, 100)
        ],
    }


def _timestamp(value):
    if isinstance(value, (int, float)):
        return float(value)
    if isinstance(value, str):
        try:
            return float(value)
        except ValueError:
            parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
            if parsed.tzinfo is None:
                raise ValueError("Missing timestamp time zone")
            return parsed.timestamp()
    raise ValueError("Invalid timestamp")


def _notification_key(notification):
    return (
        notification.get("NotificationType"), notification.get("ComparisonOperator"),
        Decimal(str(notification.get("Threshold"))),
        notification.get("ThresholdType", "PERCENTAGE"),
    )


def _check_existing(remote, plan, client, account):
    desired = plan["budget"]
    differences = []
    for field in ("BudgetName", "BudgetType", "TimeUnit"):
        if remote.get(field) != desired[field]:
            differences.append(field)
    limit = remote.get("BudgetLimit", {})
    try:
        amount_matches = Decimal(limit.get("Amount", "NaN")) == Decimal(desired["BudgetLimit"]["Amount"])
    except (InvalidOperation, TypeError, ValueError):
        amount_matches = False
    if limit.get("Unit") != "USD" or not amount_matches:
        differences.append("BudgetLimit")
    if remote.get("CostTypes") != desired["CostTypes"]:
        differences.append("CostTypes")
    if remote.get("CostFilters") or remote.get("FilterExpression") or remote.get("Metrics"):
        differences.append("budget scope or metrics")
    billing_view = remote.get("BillingViewArn")
    if billing_view and not billing_view.endswith(":billingview/primary"):
        differences.append("billing view")
    if remote.get("PlannedBudgetLimits") or remote.get("AutoAdjustData"):
        differences.append("dynamic budget amount")
    period = remote.get("TimePeriod", {})
    try:
        start = _timestamp(period.get("Start"))
        end = _timestamp(period.get("End", DEFAULT_END))
        if not 0 < start <= desired["TimePeriod"]["Start"] or end < DEFAULT_END:
            differences.append("TimePeriod")
    except (ValueError, TypeError, OverflowError):
        differences.append("TimePeriod")
    if differences:
        raise BudgetDrift(differences)

    common = ("--account-id", account, "--budget-name", BUDGET_NAME)
    notifications = client.call("budgets", "describe-notifications-for-budget", *common).get("Notifications", [])
    try:
        actual_keys = [_notification_key(row) for row in notifications]
        expected_keys = [_notification_key(row["Notification"]) for row in plan["notifications"]]
        if sorted(actual_keys) != sorted(expected_keys):
            raise BudgetDrift(["notification thresholds or types"])
    except (InvalidOperation, TypeError, ValueError, AttributeError):
        raise BudgetDrift(["notification thresholds or types"]) from None
    for row in notifications:
        notification = {key: row[key] for key in ("NotificationType", "ComparisonOperator", "Threshold")}
        notification["ThresholdType"] = row.get("ThresholdType", "PERCENTAGE")
        subscribers = client.call(
            "budgets", "describe-subscribers-for-notification", *common,
            "--notification", json.dumps(notification, separators=(",", ":")),
        ).get("Subscribers", [])
        if subscribers != plan["notifications"][0]["Subscribers"]:
            raise BudgetDrift(["notification recipients"])


def _email_status(client, email):
    try:
        contacts = client.call("notificationscontacts", "list-email-contacts").get("emailContacts", [])
        states = [row.get("status") for row in contacts if row.get("address") == email]
    except AwsCliError as error:
        return {"email_contact_status": "unavailable", "email_contact_error": error.code}
    except (TypeError, AttributeError):
        return {"email_contact_status": "unknown"}
    if "active" in states:
        state = "active"
    elif not states:
        state = "missing"
    elif all(status == "inactive" for status in states):
        state = "inactive"
    else:
        state = "unknown"
    return {"email_contact_status": state}


def execute(plan, client, verify_only=False):
    """Read and compare first; create only after a genuine NotFound response."""
    account = client.call("sts", "get-caller-identity").get("Account")
    if not isinstance(account, str) or not re.fullmatch(r"[0-9]{12}", account):
        raise AwsCliError("sts", "get-caller-identity", "InvalidIdentityResponse")
    try:
        remote = client.call(
            "budgets", "describe-budget", "--account-id", account, "--budget-name", BUDGET_NAME,
        ).get("Budget", {})
    except AwsCliError as error:
        if error.code != "NotFoundException":
            raise
        remote = None
    applied = False
    if remote is not None:
        _check_existing(remote, plan, client, account)
        status = "verified" if verify_only else "unchanged"
    elif verify_only:
        status = "missing"
    else:
        client.call(
            "budgets", "create-budget", "--account-id", account,
            "--budget", json.dumps(plan["budget"], separators=(",", ":")),
            "--notifications-with-subscribers", json.dumps(plan["notifications"], separators=(",", ":")),
        )
        applied, status = True, "created"
    email = plan["notifications"][0]["Subscribers"][0]["Address"]
    return {
        "status": status, "applied": applied, "budget_name": BUDGET_NAME, "email": email,
        "usd_budget_amount": plan["budget"]["BudgetLimit"]["Amount"],
        "reference": plan["reference"], "cost_basis": plan["cost_basis"], "notice": plan["notice"],
        **_email_status(client, email),
        "email_status_note": "Missing/inactive does not prove a legacy subscription is disabled; check the budget console. Only an active matching contact is reported active.",
    }


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--profile", required=True)
    parser.add_argument("--email", required=True)
    parser.add_argument("--reference-krw-per-usd", required=True)
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--apply", action="store_true", help="Create only if missing; AWS may send a verification email.")
    mode.add_argument("--verify-only", action="store_true", help="Read existing configuration and contact status without changing AWS.")
    args = parser.parse_args(argv)
    code = 0
    try:
        plan = build_plan(args.email, args.reference_krw_per_usd)
        result = execute(plan, AwsCli(args.profile), verify_only=args.verify_only) if args.apply or args.verify_only else plan
        if result["status"] == "missing":
            code = 1
    except BudgetDrift as error:
        result = {"status": "review_required", "applied": False, "budget_name": BUDGET_NAME, "differences": error.differences}
        code = 2
    except AwsCliError as error:
        result = {"status": "error", "budget_name": BUDGET_NAME, "error": str(error)}
        code = 1
    except ValueError as error:
        result = {"status": "invalid_input", "applied": False, "error": str(error)}
        code = 2
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return code


if __name__ == "__main__":
    raise SystemExit(main())
