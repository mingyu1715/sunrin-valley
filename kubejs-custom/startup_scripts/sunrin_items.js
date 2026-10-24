// KubeJS 6 / Minecraft 1.20.1. Restart the game/server after changing registrations.
StartupEvents.registry('item', event => {
  event.create('kubejs:geonpi_ticket')
    .texture('kubejs:item/geonpi_ticket')

  event.create('kubejs:rename_ticket')
    .texture('kubejs:item/rename_ticket')

  event.create('kubejs:sunrin_meal')
    .texture('kubejs:item/sunrin_meal')
    .tooltip(Text.translate('tooltip.kubejs.sunrin_meal'))
    .food(food => {
      food.hunger(8)
      food.saturation(1.0)
    })
})
