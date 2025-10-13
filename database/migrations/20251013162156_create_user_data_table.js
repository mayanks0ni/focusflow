exports.up = function (knex) {
  return knex.schema.createTable('userData', (table) => {
    table.increments('id').primary();
    table.text('date');
    table.text('topic');
    table.text('resources');
    table.text('feedback');
    table.text('aiRes');
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('userData');
};
