// TEST CANDIDATE. FTB Quests 2001.4.17 / KubeJS 2001.6.5-build.16.
// Complete only the original Community Center classification. Native FTB owns
// task completion, dependency propagation, reward claims and command rewards.
;(function () {
  const groupId = '106AD9AA3ADDE3AE'
  const ids = [
    '661A3A466ABF29BA','6EBAA004C1A50E98','3428ADDC87A77916',
    '3889A9F0A1CF45FF','52A3D52D6251EDB6','0B45A918213371FA',
    '0F606FEB98D44C0F','0403045A4DA7A770','1E6139BDE9202B6A',
    '6F3F87DBBBE86A28','7591439B35772AB2','174FBAB7BF83C049',
    '7466DCDD6C3CDDE8','03F3D0F74A5BC0C4','76A35BBCA4E0CDD9',
    '4D00DF575B8FC1B2','610AB8B499859791','3129F3C2D43EE6EE',
    '469CEB4C8B3C0EA9','7D155FD0EFEEB5AC','3EF57F71C1C786FE',
    '2074A4FFF17266DB','314D5DDD65659FDE','43591809C1D493F5',
    '7CBAF0748446A0C2','7CE6C320CC9F9B87','6541E0430F050B7D',
    '5629152AF2F5D6EE','10EC025C45540E52','4B9634D942E590AB'
  ]
  const chapterCounts = {
    '7C65158A3343D7FA':2, '36A9A59259467EB6':5,
    '28E0AFD408BA2300':6, '4ACD2216D1602749':6,
    '0ABCE0D05B56531F':6, '24DD5AA13FB04D9B':5
  }
  const automatic = {
    '699EAE14FFE8E2AB':{quest:'6EBAA004C1A50E98',stage:'abandoned_farm_complete'},
    '3DE1133EC784FE2F':{quest:'3428ADDC87A77916',stage:'boiler_room_complete'},
    '547F885D1C8553E3':{quest:'4B9634D942E590AB',stage:'vault_complete'}
  }
  const selfTargets = {
    '699EAE14FFE8E2AB':{quest:'6EBAA004C1A50E98',stage:'abandoned_farm_complete',auto:'INVISIBLE'},
    '3DE1133EC784FE2F':{quest:'3428ADDC87A77916',stage:'boiler_room_complete',auto:'INVISIBLE'},
    '547F885D1C8553E3':{quest:'4B9634D942E590AB',stage:'vault_complete',auto:'INVISIBLE'},
    '5C52F171AEBC2238':{quest:'45120BEE01BB36B4',stage:'community_center_complete',auto:'INVISIBLE'},
    '757BB197D52F88E4':{quest:'5FDA526D348C8A0F',stage:'ftbchunks_mapping',auto:'DISABLED'}
  }
  const sessions = {}
  let api = null
  let preparedFile = null, prepared = null, preparingFile = null, preparationAttempts = 0
  function nativeApi() {
    if (!api) api = {
      File:Java.loadClass('dev.ftb.mods.ftbquests.quest.ServerQuestFile'),
      TeamData:Java.loadClass('dev.ftb.mods.ftbquests.quest.TeamData'),
      Change:Java.loadClass('dev.ftb.mods.ftbquests.util.ProgressChange'),
      ProgressEvent:Java.loadClass('dev.ftb.mods.ftbquests.events.QuestProgressEventData'),
      Player:Java.loadClass('net.minecraft.server.level.ServerPlayer'),
      Tag:Java.loadClass('net.minecraft.nbt.CompoundTag'),
      Stages:Java.loadClass('dev.latvian.mods.kubejs.stages.Stages'),
      Date:Java.loadClass('java.util.Date'),
      Collections:Java.loadClass('java.util.Collections')
    }
    return api
  }
  function code(object) {
    const value = String(object.getCodeString())
    if (!/^[0-9A-F]{16}$/.test(value)) throw Error('Invalid native quest ID')
    return value
  }
  // Resolve by native hexadecimal strings: never round a 64-bit FTB ID through
  // a JavaScript Number. Validate the full boundary before changing any progress.
  function preflight(file) {
    const found = {}, rewards = {}, seenChapters = {}, selectors = {}
    let nativeGroup = null
    file.getAllChapters().forEach(chapter => {
      chapter.getQuests().forEach(quest => {
        const questId = code(quest)
        if (!Object.keys(selfTargets).some(id => selfTargets[id].quest === questId)) return
        quest.getRewards().forEach(reward => {
          const rewardId = code(reward), expected = selfTargets[rewardId]
          if (!expected) return
          if (expected.quest !== questId || selectors[rewardId] || String(reward.getAutoClaimType().name()) !== expected.auto || reward.isTeamReward()) throw Error('Native stage reward mismatch: ' + rewardId)
          const before = new (nativeApi().Tag)()
          reward.writeData(before)
          const command = String(before.getString('command'))
          if (command !== '/kjs stages add @p ' + expected.stage && command !== '/kjs stages add @s ' + expected.stage) throw Error('Unexpected native stage command: ' + rewardId)
          selectors[rewardId] = {reward:reward,before:before,command:'/kjs stages add @s ' + expected.stage}
        })
      })
      if (code(chapter.getGroup()) !== groupId) return
      nativeGroup = chapter.getGroup()
      const chapterId = code(chapter)
      if (!chapterCounts[chapterId] || seenChapters[chapterId]) throw Error('Community chapter mismatch')
      seenChapters[chapterId] = true
      let count = 0
      chapter.getQuests().forEach(quest => {
        const questId = code(quest)
        if (ids.indexOf(questId) < 0 || found[questId]) throw Error('Community quest allowlist mismatch: ' + questId)
        found[questId] = quest
        count++
        quest.getRewards().forEach(reward => {
          const rewardId = code(reward), expected = automatic[rewardId]
          const auto = String(reward.getAutoClaimType().name())
          if (expected) {
            if (expected.quest !== questId || auto !== 'INVISIBLE' || reward.isTeamReward()) throw Error('Native automatic reward mismatch: ' + rewardId)
            rewards[rewardId] = reward
          } else if (auto !== 'DISABLED') throw Error('Unexpected automatic Community reward: ' + rewardId)
        })
      })
      if (count !== chapterCounts[chapterId]) throw Error('Community chapter quest count mismatch')
    })
    if (Object.keys(found).length !== 30 || Object.keys(seenChapters).length !== 6 || Object.keys(rewards).length !== 3 || Object.keys(selectors).length !== 5) throw Error('Expected 30 Community quests, six chapters, three automatic rewards and five fixed native stage commands')
    return {quests:ids.map(id => found[id]), rewards:rewards, selectors:selectors, group:nativeGroup}
  }
  function isPrepared(file) {
    if (preparedFile !== file || !prepared) return false
    // Native /ftbquests reload keeps its QuestFile but rebuilds non-default
    // chapter groups. The actual group reference is a cheap generation anchor.
    if (file.getChapterGroups().contains(prepared.group)) return true
    preparedFile = null; prepared = null; preparingFile = null; preparationAttempts = 0
    Object.keys(sessions).forEach(id => { delete sessions[id] })
    return false
  }
  function prepare(file) {
    if (isPrepared(file)) return prepared
    const validated = preflight(file), changed = []
    // Native CommandReward substitutes {p}, not @p. Its source is the claiming
    // player, so @s preserves personal rewards even at identical spawn positions.
    // Only five known command IDs/texts are normalized, only in native memory.
    try {
      Object.keys(validated.selectors).forEach(id => {
        const row = validated.selectors[id]
        if (String(row.before.getString('command')) === row.command) return
        const after = row.before.copy(), verified = new (nativeApi().Tag)()
        after.putString('command',row.command)
        changed.push(row)
        row.reward.readData(after)
        row.reward.writeData(verified)
        if (code(row.reward) !== id || !after.equals(verified)) throw Error('Native stage reward round trip changed metadata: ' + id)
      })
    } catch (error) {
      changed.forEach(row => row.reward.readData(row.before))
      throw error
    }
    preparedFile = file
    prepared = validated
    return validated
  }
  function prepareServer() {
    let file = null
    try {
      file = nativeApi().File.INSTANCE
      if (preparingFile !== file) { preparingFile = file; preparationAttempts = 0 }
      if (isPrepared(file) || preparationAttempts >= 30) return
      preparationAttempts++
      if (!file || file.isLoading() || !file.isServerSide()) throw Error('Server QuestFile is not ready for native selector validation')
      prepare(file)
    } catch (error) {
      if (preparationAttempts <= 1 || preparationAttempts === 30) console.error('[SUNRIN COMMUNITY] Native selector preparation pending: ' + String(error))
    }
  }
  function complete(file, team, player, validated) {
    const native = nativeApi()
    if (team.isLocked()) throw Error('Native team progress is locked')
    // Native dependencies determine order. Each pass must make progress; no
    // object outside this allowlist is force-completed, including Perfection.
    file.withPlayerContext(player, () => {
      for (let pass = 0; pass < 30; pass++) {
        let before = 0, after = 0
        validated.quests.forEach(quest => { if (team.isCompleted(quest)) before++ })
        if (before === 30) break
        validated.quests.forEach(quest => {
          if (team.isCompleted(quest) || !team.areDependenciesComplete(quest)) return
          quest.getTasks().forEach(task => {
            // Skip satisfied tasks to retain their existing progress and dates.
            if (team.getProgress(task) < task.getMaxProgress()) {
              const change = new native.Change(file, task, player.getUuid()).setReset(false)
              task.forceProgressRaw(team, change)
            }
            if (!team.isCompleted(task) && team.getProgress(task) >= task.getMaxProgress()) team.markTaskCompleted(task)
          })
          // Recover native data with all task progress already present but no
          // quest completion event yet; onCompleted itself guards old dates.
          if (!team.isCompleted(quest) && quest.isCompletedRaw(team)) {
            quest.onCompleted(new native.ProgressEvent(new native.Date(),team,quest,team.getOnlineMembers(),native.Collections.emptyList()))
          }
        })
        validated.quests.forEach(quest => { if (team.isCompleted(quest)) after++ })
        if (after === before) break
      }
      validated.quests.forEach(quest => {
        if (!team.isCompleted(quest)) throw Error('Community completion not confirmed: ' + code(quest))
        // Also catches up a teammate who was offline during completion. Native
        // claimReward checks its existing per-player reward ledger before grant.
        team.checkAutoCompletion(quest)
      })
    })
    Object.keys(automatic).forEach(rewardId => {
      if (!team.isRewardClaimed(player.getUuid(),validated.rewards[rewardId])) throw Error('Native automatic claim not confirmed: ' + rewardId)
      if (!native.Stages.get(player).has(automatic[rewardId].stage)) throw Error('Native stage missing after automatic reward: ' + automatic[rewardId].stage)
    })
  }
  function attempt(server, player) {
    let session = null, playerId = null, native = null, file = null, team = null, teamId = null
    try {
      native = nativeApi()
      if (!(player instanceof native.Player) || player.isFake()) return
      playerId = String(player.getUuid())
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(playerId)) throw Error('Invalid server player UUID')
      session = sessions[playerId]
      if (!session) session = sessions[playerId] = {attempts:0,done:false,file:null,team:null,teamData:null}
      file = native.File.INSTANCE
      if (session.file !== file) {
        session.attempts = 0; session.done = false; session.file = file; session.team = null; session.teamData = null
      }
      if (!session.done && session.attempts >= 30) {
        // Exhaustion belongs to this context, not the player forever. The
        // native membership predicate can discover a transfer without retrying
        // a failed TeamData lookup in the same context on every server sample.
        if (!file || !session.teamData || file.isPlayerOnTeam(player,session.teamData)) return
        session.attempts = 0
      }
      // Count before native lookups: an exception here must still be reported
      // and bounded, rather than disappearing behind an attempts===1 check.
      session.attempts++
      // The Entity/UUID getOrCreateTeamData overload is ambiguous in pinned
      // Rhino. The verified single-signature native helper resolves it in Java.
      team = file && !file.isLoading() && file.isServerSide() ? native.TeamData.get(player) : null
      teamId = team ? String(team.getTeamId()) : null
      if (session.file !== file || session.team !== teamId) {
        session.attempts = 1; session.done = false; session.file = file; session.team = teamId; session.teamData = team
      }
      if (session.done) { session.attempts = 0; return }
      if (!file || file.isLoading() || !file.isServerSide() || !team) throw Error('Server QuestFile/team is not ready')
      complete(file,team,player,prepare(file))
      session.done = true
      console.info('[SUNRIN COMMUNITY] Verified 30 quests and three native automatic reward claims for current team')
    } catch (error) {
      // No durable receipt is written. A failed claim/stage never becomes a
      // success cache entry; relogin or script reload permits another retry run.
      if (!session || session.attempts === 1 || session.attempts === 30) {
        console.error('[SUNRIN COMMUNITY] ' + (session && session.attempts === 30 ? 'Stopped after 30 attempts; relogin or reload after repair: ' : 'Pending: ') + String(error))
      }
    }
  }
  PlayerEvents.loggedIn(event => attempt(event.server,event.player))
  PlayerEvents.loggedOut(event => { delete sessions[String(event.player.getUuid())] })
  ServerEvents.loaded(event => { prepareServer(); event.server.players.forEach(player => attempt(event.server,player)) })
  // Script reevaluation does not emit loaded in pinned KubeJS. One-second
  // server samples cover reload, joins after FTB team setup and team transfers.
  ServerEvents.tick(event => {
    if (event.server.getTickCount()%20 === 0) { prepareServer(); event.server.players.forEach(player => attempt(event.server,player)) }
  })
})()
