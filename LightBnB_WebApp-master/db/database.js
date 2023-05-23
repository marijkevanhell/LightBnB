const properties = require("./json/properties.json");
const users = require("./json/users.json");

const { Pool } = require("pg");

const pool = new Pool({
  user: "vagrant",
  password: "123",
  host: "localhost",
  database: "lightbnb",
});

/// Users

/**
 * Get a single user from the database given their email.
 * @param {String} email The email of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithEmail = function(email) {
  const queryString = `SELECT * FROM users
    WHERE email = $1`;
  const values = [email];
  return pool
    .query(queryString, values)
    .then((res) => res.rows[0] || null)
    .catch((err) => err);
};

/**
 * Get a single user from the database given their id.
 * @param {string} id The id of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithId = function(id) {
  const queryString = `SELECT * FROM users
    WHERE id = $1`;
  const values = [id];
  return pool
    .query(queryString, values)
    .then((res) => res.rows[0] || null)
    .catch((err) => err);
};

/**
 * Add a new user to the database.
 * @param {{name: string, password: string, email: string}} user
 * @return {Promise<{}>} A promise to the user.
 */
const addUser = function(user) {
  const queryString = `INSERT INTO users (name, email, password) 
    VALUES ($1, $2, $3)
    RETURNING *`;
  const values = [user.name, user.email, user.password];
  return pool
    .query(queryString, values)
    .then((res) => res.rows[0])
    .catch((err) => err);
};

/// Reservations

/**
 * Get all reservations for a single user.
 * @param {string} guest_id The id of the user.
 * @return {Promise<[{}]>} A promise to the reservations.
 */
const getAllReservations = function(guest_id, limit = 10) {
  const queryString = `SELECT properties.*, reservations.*, avg(rating) as average_rating
    FROM reservations
    JOIN properties ON reservations.property_id = properties.id
    JOIN property_reviews ON properties.id = property_reviews.property_id
    WHERE reservations.guest_id = $1
    AND reservations.end_date < now()
    GROUP BY properties.id, reservations.id
    ORDER BY reservations.start_date
    LIMIT $2`;
  const values = [guest_id, limit];
  return pool
    .query(queryString, values)
    .then((res) => res.rows)
    .catch((err) => err);
};

/// Properties

/**
 * Get all properties.
 * @param {{}} options An object containing query options.
 * @param {*} limit The number of results to return.
 * @return {Promise<[{}]>}  A promise to the properties.
 */
const getAllProperties = function(options, limit = 10) {
  //1. Setup an array to hold any parameters that may be available for the query
  const queryParams = [];

  //2. Start the query with all information that comes before the WHERE clause
  let queryString = `
  SELECT properties.*, avg(property_reviews.rating) as average_rating
  FROM properties
  JOIN property_reviews ON properties.id = property_id
  `;

  let filterQuery = [];

  //3. Check if filters have been passed in as options
  if (options.city) {
    queryParams.push(`%${options.city}%`);
    filterQuery.push(`city LIKE $${queryParams.length} `);
  }

  if (options.owner_id) {
    queryParams.push(options.owner_id);
    filterQuery.push(`WHERE owner_id = $${queryParams.length}`);
  }

  if (options.minimum_rating) {
    queryParams.push(options.minimum_rating);
    filterQuery.push(`property_reviews.rating >= $${queryParams.length}`);
  }

  if (options.minimum_price_per_night) {
    queryParams.push(options.minimum_price_per_night * 100);
    filterQuery.push(`cost_per_night >= $${queryParams.length}`);
  }

  if (options.maximum_price_per_night) {
    queryParams.push(Number(options.maximum_price_per_night) * 100);
    filterQuery.push(`cost_per_night <= $${queryParams.length}`);
  }

  queryParams.push(limit);

  //if more than one param, option added to queryString using WHERE and AND
  if (filterQuery.length > 0) {
    queryString += `WHERE ${filterQuery.join(" AND ")} `;
  }

  //4. Add any query that comes after the WHERE clause
  //adds GROUP BY and ORDER BY to queryString to sort
  queryString += `
  GROUP BY properties.id
  ORDER BY cost_per_night
  `;

  queryString += `LIMIT $${queryParams.length}`;

  //5. Console log everything just to make sure we've done it right
  console.log(queryString, queryParams);

  //6. Run the query
  return pool.query(queryString, queryParams).then((res) => {
    console.log(res.rows);
    return res.rows;
  });
};

/**
 * Add a property to the database
 * @param {{}} property An object containing all of the property details.
 * @return {Promise<{}>} A promise to the property.
 */
const addProperty = function(property) {
  const queryString = `INSERT INTO properties (owner_id, title, description, thumbnail_photo_url, cover_photo_url, cost_per_night, street, city, province, post_code, country, parking_spaces, number_of_bathrooms, number_of_bedrooms)
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
  RETURNING *;
  `;
  const values = [
    property.owner_id,
    property.title,
    property.description,
    property.thumbnail_photo_url,
    property.cover_photo_url,
    property.cost_per_night,
    property.street,
    property.city,
    property.province,
    property.post_code,
    property.country,
    property.parking_spaces,
    property.number_of_bathrooms,
    property.number_of_bedrooms,
  ];
  return pool
    .query(queryString, values)
    .then((res) => res.rows[0])
    .catch((err) => err);
};

module.exports = {
  getUserWithEmail,
  getUserWithId,
  addUser,
  getAllReservations,
  getAllProperties,
  addProperty,
};
