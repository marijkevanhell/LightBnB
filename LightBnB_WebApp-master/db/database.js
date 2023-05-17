const properties = require("./json/properties.json");
const users = require("./json/users.json");

const { Pool } = require('pg');

const pool = new Pool({
  user: 'vagrant',
  password: '123',
  host: 'localhost',
  database: 'lightbnb'
});


/// Users

/**
 * Get a single user from the database given their email.
 * @param {String} email The email of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithEmail = function (email) {
  const queryString = `SELECT * FROM users
    WHERE email = $1`;
    const values = [email];
    return pool.query(queryString, values)
    .then(res => res.rows[0] || null)
    .catch(err => err);
}

/**
 * Get a single user from the database given their id.
 * @param {string} id The id of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithId = function (id) {
  const queryString = `SELECT * FROM users
    WHERE id = $1`;
    const values = [id];
    return pool.query(queryString, values)
    .then(res => res.rows[0] || null)
    .catch(err => err);
};

/**
 * Add a new user to the database.
 * @param {{name: string, password: string, email: string}} user
 * @return {Promise<{}>} A promise to the user.
 */
const addUser = function (user) {
  const queryString = `INSERT INTO users (name, email, password) 
    VALUES ($1, $2, $3)
    RETURNING *`;
    const values = [ user.name, user.email, user.password ];
    return pool.query(queryString, values)
    .then(res => res.rows[0])
    .catch(err => err);
};

/// Reservations

/**
 * Get all reservations for a single user.
 * @param {string} guest_id The id of the user.
 * @return {Promise<[{}]>} A promise to the reservations.
 */
const getAllReservations = function (guest_id, limit = 10) {
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
    return pool.query(queryString, values)
    .then(res => res.rows)
    .catch(err => err);
};

/// Properties

/**
 * Get all properties.
 * @param {{}} options An object containing query options.
 * @param {*} limit The number of results to return.
 * @return {Promise<[{}]>}  A promise to the properties.
 */
const getAllProperties = (options, limit = 10) => {
  //1. Setup an array to hold any parameters that may be available for the query
  const queryParams = [];
  //2. Start the query with all information that comes before the WHERE clause
  let queryString = `
    SELECT properties.*, avg(property_reviews.rating) as average_rating
    FROM properties
    LEFT JOIN property_reviews ON properties.id = property_id
  `;

  //3. Check if filters have been passed in as options
  if (options.city) {
    queryParams.push(`%${options.city}%`);
    queryString += `WHERE city LIKE $${queryParams.length} `;
  }

  //checks if owner id has been past as option
  if (options.owner_id) {
    queryParams.push(options.owner_id);
    //if first param is owner id and array queryParams only has the 1, adds WHERE clause to string
    if (queryParams.length === 1) {
      queryString += `WHERE owner_id = $${queryParams.length} `;
      //or if more than 1 in array, adds AND clause to string
    } else {
      queryString += `AND owner_id = $${queryParams.length} `;
    }
  }

  //filters cost_per_night
  if (options.minimum_price_per_night && options.maximum_price_per_night) {
    //* 100 converts them from dollars to cents
    queryParams.push(options.minimum_price_per_night * 100, options.maximum_price_per_night * 100);
    //if first 2 params are options.minimum_price_per_night && options.maximum_price_per_night so queryParams.length === 2, adds WHERE clause to string
    if (queryParams.length === 2) {
      queryString += `WHERE cost_per_night >= $${queryParams.length - 1} AND cost_per_night <= $${queryParams.length} `;
      //or if more than 2 params, adds AND clause to string
    } else {
      queryString += `AND cost_per_night >= $${queryParams.length - 1} AND cost_per_night <= $${queryParams.length} `;
    }
  }

//4. Add any query that comes after the WHERE clause
  //adds GROUP BY to queryString to sort
  queryString += `
  GROUP BY properties.id
  `;

  //if options.minimum_rating exists, avg rating added to string to filter further
  if (options.minimum_rating) {
    queryParams.push(options.minimum_rating);
    queryString += `HAVING avg(property_reviews.rating) >= $${queryParams.length} `;
  }

  //adds limit value & ORDER BY to string
  queryParams.push(limit);
  queryString += `ORDER BY cost_per_night
  LIMIT $${queryParams.length};
  `;

  //5. Console log everything just to make sure we've done it right
  console.log(queryString, queryParams);

  //6. Run the query
  return pool.query(queryString, queryParams).then((res) => res.rows);
 
};

/**
 * Add a property to the database
 * @param {{}} property An object containing all of the property details.
 * @return {Promise<{}>} A promise to the property.
 */
const addProperty = function (property) {
  const propertyId = Object.keys(properties).length + 1;
  property.id = propertyId;
  properties[propertyId] = property;
  return Promise.resolve(property);
};

module.exports = {
  getUserWithEmail,
  getUserWithId,
  addUser,
  getAllReservations,
  getAllProperties,
  addProperty,
};
