// create_banner_table.js
exports.up = function (knex) {
  return knex.schema.createTable('Banner', (table) => {
    table.increments('Id').primary();
    table.string('Title', 255).notNullable();
    table.string('ImageUrl', 512).notNullable();
    table.string('RedirectUrl', 512).nullable();
    table.boolean('IsActive').defaultTo(true);
    table.timestamp('CreatedAt').defaultTo(knex.fn.now());
    table.timestamp('UpdatedAt').defaultTo(knex.fn.now());
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('Banner');
};