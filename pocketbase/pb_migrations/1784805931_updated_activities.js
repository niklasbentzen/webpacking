/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("no5deskbff5ub8f")

  // update field
  collection.fields.addAt(3, new Field({
    "hidden": false,
    "id": "xe874zzb",
    "maxSelect": 1,
    "maxSize": 20971520,
    "mimeTypes": [],
    "name": "gpxFile",
    "presentable": false,
    "protected": false,
    "required": false,
    "system": false,
    "thumbs": [],
    "type": "file"
  }))

  // update field
  collection.fields.addAt(4, new Field({
    "hidden": false,
    "id": "file2075481930",
    "maxSelect": 1,
    "maxSize": 20971520,
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

  // revert field
  collection.fields.addAt(3, new Field({
    "hidden": false,
    "id": "xe874zzb",
    "maxSelect": 1,
    "maxSize": 5242880,
    "mimeTypes": [],
    "name": "gpxFile",
    "presentable": false,
    "protected": false,
    "required": false,
    "system": false,
    "thumbs": [],
    "type": "file"
  }))

  // revert field
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
})
