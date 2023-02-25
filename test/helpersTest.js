const { assert } = require('chai');

const { getUserByEmail } = require('../helpers.js');

const testUsers = {
  "userRandomID": {
    id: "userRandomID", 
    email: "user@example.com", 
    password: "purple-monkey-dinosaur"
  },
  "user2RandomID": {
    id: "user2RandomID", 
    email: "user2@example.com", 
    password: "dishwasher-funk"
  }
};

// describe('getUserByEmail', function() {
//   it('should return a user with valid email', function() {
//     const user = getUserByEmail("user@example.com", testUsers)
//     const expectedUserID = "userRandomID";
//     // Write your assert statement here
//     assert.isObject(user, "user is an object");
//     assert.deepEqual(user, testUsers["userRandomID"], "user object should match");
//   });
// });


describe('getUserByEmail', function() {
  it('should return a user with valid email', function() {
    const user = getUserByEmail("user@example.com", testUsers)
    const expectedUserID = "userRandomID";
    assert.equal(user.id, expectedUserID);
  });

  it('should return undefined when provided with a non-existent email', function() {
    const user = getUserByEmail("nonexistent@example.com", testUsers)
    assert.isUndefined(user);
  });
});

