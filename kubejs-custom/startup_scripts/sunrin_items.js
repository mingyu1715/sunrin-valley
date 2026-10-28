// KubeJS 6 / Minecraft 1.20.1. Restart the game/server after changing registrations.
StartupEvents.registry('item', event => {
  event.create('kubejs:geonpi_ticket')
    .texture('kubejs:item/geonpi_ticket')
    .tooltip(Text.translate('tooltip.kubejs.geonpi_ticket'))

  event.create('kubejs:rename_ticket')
    .texture('kubejs:item/rename_ticket')
    .tooltip(Text.translate('tooltip.kubejs.rename_ticket'))

  event.create('kubejs:sunrin_meal')
    .texture('kubejs:item/sunrin_meal')
    .tooltip(Text.translate('tooltip.kubejs.sunrin_meal'))
    .food(food => {
      food.hunger(8)
      food.saturation(1.0)
    })
  ;['random_box', 'furniture_random_box', 'name_color_ticket'].forEach(id => {
    event.create('kubejs:' + id)
      .texture('kubejs:item/' + id)
      .tooltip(Text.translate('tooltip.kubejs.' + id))
  })
  event.create('kubejs:town_warp_ticket')
    .texture('minecraft:item/map')
    .tooltip(Text.translate('tooltip.kubejs.town_warp_ticket'))
})
