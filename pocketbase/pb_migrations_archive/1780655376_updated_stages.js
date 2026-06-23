/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("y6vjmz1ur2shltk")

  // update collection data
  unmarshal({
    "listRule": "@request.auth.role = \"admin\"\n||\n(@request.auth.role = \"dotWatcher\" && published = true)\n||\n(published = true && publicAt <= @now)\n",
    "viewRule": "@request.auth.role = \"admin\"\n||\n(@request.auth.role = \"dotWatcher\" && published = true)\n||\n(published = true && publicAt <= @now)\n"
  }, collection)

  // add field
  collection.fields.addAt(3, new Field({
    "hidden": false,
    "id": "date3697902585",
    "max": "",
    "min": "",
    "name": "publicAt",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "date"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("y6vjmz1ur2shltk")

  // update collection data
  unmarshal({
    "listRule": "@request.auth.role = \"admin\"\n||\n(@request.auth.role = \"dotWatcher\" && published = true)\n||\n(published = true && endDate <= strftime('%Y-%m-%d %H:%M:%S', @now, '-48 hours'))",
    "viewRule": "@request.auth.role = \"admin\"\n||\n(@request.auth.role = \"dotwatcher\" && published = true)\n||\n(published = true && endDate <= strftime('%Y-%m-%d %H:%M:%S', @now, '-48 hours'))"
  }, collection)

  // remove field
  collection.fields.removeById("date3697902585")

  return app.save(collection)
})
