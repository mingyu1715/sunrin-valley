// Execute the real startup script at the KubeJS registry boundary.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const scriptPath = path.join(__dirname, 'startup_scripts', 'sunrin_items.js');
const packRoot = path.join(__dirname, '..', 'resourcepacks', 'Sunrin-Custom');

function registerItems() {
  assert.ok(fs.existsSync(scriptPath), 'Sunrin startup script is missing');
  const items = new Map();
  const registryTypes = [];
  const context = {
    StartupEvents: {
      registry(type, callback) {
        registryTypes.push(type);
        callback({
          create(id) {
            assert.ok(!items.has(id), `Duplicate item: ${id}`);
            const item = { id, texture: null, food: null, tooltips: [] };
            items.set(id, item);
            const builder = {
              texture(location) { item.texture = location; return builder; },
              tooltip(component) { item.tooltips.push(component); return builder; },
              food(configure) {
                const properties = {};
                const food = {
                  hunger(value) { properties.nutrition = value; return food; },
                  saturation(value) { properties.saturationModifier = value; return food; },
                };
                configure(food);
                item.food = properties;
                return builder;
              },
            };
            return builder;
          },
        });
      },
    },
    Text: { translate(key) { return { translate: key }; } },
  };
  vm.runInNewContext(fs.readFileSync(scriptPath, 'utf8'), context, { filename: scriptPath });
  assert.deepEqual(registryTypes, ['item']);
  return items;
}

test('startup registry preserves six items and adds the vanilla-map town ticket', () => {
  const items = registerItems();
  assert.deepEqual([...items.keys()], ['kubejs:geonpi_ticket', 'kubejs:rename_ticket', 'kubejs:sunrin_meal', 'kubejs:random_box', 'kubejs:furniture_random_box', 'kubejs:name_color_ticket', 'kubejs:town_warp_ticket']);
  for (const item of items.values()) {
    const [namespace, name] = item.id.split(':');
    assert.equal(item.texture, name === 'town_warp_ticket' ? 'minecraft:item/map' : `${namespace}:item/${name}`);
    const model = JSON.parse(fs.readFileSync(path.join(packRoot, 'assets', namespace, 'models', 'item', `${name}.json`), 'utf8'));
    assert.equal(model.textures.layer0, item.texture);
    if (name !== 'town_warp_ticket') assert.ok(fs.existsSync(path.join(packRoot, 'assets', namespace, 'textures', 'item', `${name}.png`)));
  }
});

test('only the meal is food and its translated tooltip and properties match the request', () => {
  const items = registerItems();
  assert.equal(items.get('kubejs:geonpi_ticket').food, null);
  assert.equal(items.get('kubejs:rename_ticket').food, null);
  assert.deepEqual(items.get('kubejs:sunrin_meal').food, { nutrition: 8, saturationModifier: 1.0 });
  const tooltip = items.get('kubejs:sunrin_meal').tooltips;
  assert.deepEqual(tooltip, [{ translate: 'tooltip.kubejs.sunrin_meal' }]);
  const lang = JSON.parse(fs.readFileSync(path.join(packRoot, 'assets', 'kubejs', 'lang', 'ko_kr.json'), 'utf8'));
  assert.equal(lang['item.kubejs.sunrin_meal'], '선린 급식');
  assert.equal(lang[tooltip[0].translate], '학교에서 먹던 그 맛.');
});

test('all tickets and boxes have translated tooltips', () => {
  for (const [id,item] of registerItems()) {
    if (id !== 'kubejs:sunrin_meal') assert.deepEqual(item.tooltips, [{translate:'tooltip.'+id.replace(':','.') }]);
  }
});
