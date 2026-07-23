/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("no5deskbff5ub8f")

  // add field
  collection.fields.addAt(4, new Field({
    "hidden": false,
    "id": "file2075481930",
    "maxSelect": 1,
    "maxSize": 10485760,
    "mimeTypes": [],
    "name": "fitFile",
    "presentable": false,
    "protected": false,
    "required": false,
    "system": false,
    "thumbs": [],
    "type": "file"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("no5deskbff5ub8f")

  // remove field
  collection.fields.removeById("file2075481930")

  return app.save(collection)
})
