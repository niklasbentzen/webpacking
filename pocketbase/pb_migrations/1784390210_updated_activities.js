/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("no5deskbff5ub8f")

  // update collection data
  unmarshal({
    "listRule": "@request.auth.role = \"admin\" || stage.published = true",
    "viewRule": "@request.auth.role = \"admin\" || stage.published = true"
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("no5deskbff5ub8f")

  // update collection data
  unmarshal({
    "listRule": "stage.published = true",
    "viewRule": "stage.published = true"
  }, collection)

  return app.save(collection)
})
