exports.up = function(knex) {
  return knex.schema.createTable('UserOtps', function (table) {
    table.increments('id').primary();
    table.string('mobile').notNullable();
    table.string('otp').notNullable();
    table.string('type').notNullable().defaultTo('login'); // e.g. login, signup, etc.
    table.timestamp('expiresAt').notNullable();
    table.boolean('verified').defaultTo(false);
    table.timestamps(true, true); // adds created_at and updated_at
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('UserOtps');
};