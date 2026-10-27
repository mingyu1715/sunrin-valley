const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const script = process.env.SUNRIN_CHAT_SCRIPT || path.join(__dirname, '../server_scripts/playerEvents/chatColors.js');
const colors = [0x000000,0x0000aa,0x00aa00,0x00aaaa,0xaa0000,0xaa00aa,0xffaa00,0xaaaaaa,0x555555,0x5555ff,0x55ff55,0x55ffff,0xff5555,0xff55ff,0xffff55,0xffffff];
function component(text = '') {
  return { text: String(text), children: [], rgb: null,
    append(child) { this.children.push(typeof child === 'string' ? component(child) : child); return this; },
    color(rgb) { this.rgb = rgb; return this; }, gray() { return this.color(0xaaaaaa); }, white() { return this.color(0xffffff); },
  };
}
function runs(value, inherited = 0xffffff) {
  if (typeof value === 'string') value = component(value);
  let color = value.rgb === null ? inherited : value.rgb;
  const result = [];
  for (let i = 0; i < value.text.length; i++) {
    if (value.text[i] === '§' && i + 1 < value.text.length) {
      const code = value.text[++i].toLowerCase(), index = parseInt(code, 16);
      if (!Number.isNaN(index)) color = colors[index]; else if (code === 'r') color = 0xffffff;
      continue;
    }
    result.push({char:value.text[i], color});
  }
  for (const child of value.children) result.push(...runs(child, value.rgb === null ? inherited : value.rgb));
  return result;
}
function fixture(options = {}) {
  let handler;
  const sent = [], bridgeCalls = [];
  const player = {name:{toString:()=> { if (options.noCore) throw Error('Component debug text is not a username API'); return 'literal{peach_min}'; }},
    isCuriosEquipped: dye => (options.dyes || []).includes(dye)};
  const bridge = {chatDisplayName(p, fallbackRgb) {
    assert.equal(p, player); bridgeCalls.push(fallbackRgb);
    const display = component(options.team ? '팀 ' : '').color(options.team ? 0x5555ff : null);
    if (options.title) display.append(component('[선린] ').color(0xffaa00));
    // Model a colored team wrapper around the explicit profile account style.
    display.append(component('peach_min').color(options.nameColor ?? fallbackRgb));
    return display;
  }};
  vm.runInNewContext(fs.readFileSync(script, 'utf8'), {
    global:{enableChatColors: options.enabled !== false}, console:{error(){}},
    Java:{loadClass(name) {
      if (name === 'net.minecraft.network.chat.TextColor') return {fromRgb:rgb=>({toString:()=> '#'+rgb.toString(16).padStart(6,'0')})};
      if (name === 'dev.sunrin.core.api.SunrinBridge') { if(options.noCore) throw Error('Core unavailable'); return bridge; }
      throw Error('Unexpected class '+name);
    }}, Text:{of: value => typeof value === 'object' ? value : component(value)},
    PlayerEvents:{chat(fn) { assert.equal(handler,undefined,'Only one chat renderer may register'); handler=fn; }},
  }, {filename:script});
  const event = {player,username:'peach_min',message:options.message || 'hello',server:{tell:message=>sent.push(message)},canceled:0,cancel(){this.canceled++;}};
  handler(event);
  return {sent,event,bridgeCalls,rendered:sent.length ? runs(sent[0]) : [],text:sent.length ? runs(sent[0]).map(x=>x.char).join('') : ''};
}
function colorOf(f, text) { const index=f.text.indexOf(text); assert.notEqual(index,-1, 'Missing text: '+text); return f.rendered.slice(index,index+text.length).map(x=>x.color); }

test('chat retains title and ticket name color over equipped dye and a colored team', () => {
  const f=fixture({title:true,nameColor:0x55ffff,dyes:['minecraft:red_dye'],team:true});
  assert.match(f.text,/팀 \[선린\] peach_min » hello/);
  assert.deepEqual(colorOf(f,'[선린]'),Array(4).fill(0xffaa00));
  assert.deepEqual(colorOf(f,'peach_min'),Array(9).fill(0x55ffff));
  assert.equal(f.sent.length,1);assert.equal(f.event.canceled,1);
});
test('title-only profiles inherit the original last-equipped-dye priority even with a colored team', () => {
  const f=fixture({title:true,dyes:['minecraft:white_dye','minecraft:red_dye','minecraft:pink_dye'],team:true});
  assert.deepEqual(f.bridgeCalls,[0xff55ff]);
  assert.deepEqual(colorOf(f,'[선린]'),Array(4).fill(0xffaa00));
  assert.deepEqual(colorOf(f,'peach_min'),Array(9).fill(0xff55ff));
});
test('default chat keeps white fallback, gray arrow and message ampersand colors', () => {
  const f=fixture({message:'plain &ared&r normal'});
  assert.deepEqual(f.bridgeCalls,[0xffffff]);
  assert.deepEqual(colorOf(f,'peach_min'),Array(9).fill(0xffffff));
  assert.deepEqual(colorOf(f,'»'),[0xaaaaaa]);
  assert.deepEqual(colorOf(f,'red'),Array(3).fill(0x55ff55));
  assert.deepEqual(colorOf(f,'normal'),Array(6).fill(0xffffff));
});
test('missing Core uses the native account name and retains Curios colors', () => {
  const f=fixture({noCore:true,dyes:['minecraft:cyan_dye']});
  assert.equal(f.text,' peach_min » hello');
  assert.deepEqual(colorOf(f,'peach_min'),Array(9).fill(0x00aaaa));
  assert.equal(f.event.canceled,1);
});
test('disabled upstream chat colors leave the original chat event alone', () => {
  const f=fixture({enabled:false,title:true,nameColor:0x55ffff});
  assert.equal(f.sent.length,0);assert.equal(f.event.canceled,0);assert.equal(f.bridgeCalls.length,0);
});
