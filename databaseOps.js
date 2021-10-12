'use strict'

// database operations.
// Async operations can always fail, so these are all wrapped in try-catch blocks
// so that they will always return something
// that the calling function can use. 

module.exports = {
  testDB: testDB,
  post_activity: post_activity,
  get_most_recent_planned_activity_in_range: get_most_recent_planned_activity_in_range,
  delete_past_activities_in_range: delete_past_activities_in_range,
  get_most_recent_entry: get_most_recent_entry,
  get_similar_activities_in_range: get_similar_activities_in_range,
  get_all: get_all,

  // export for profile table
  add_entry_to_profile: add_entry_to_profile,
  get_userData_from_id: get_userData_from_id,
  remove_entries_from_profile: remove_entries_from_profile,
  get_all_profiles: get_all_profiles,
  check_if_user_exists: check_if_user_exists
}



// using a Promises-wrapped version of sqlite3
const db = require('./sqlWrap');

// our activity verifier
const act = require('./activity');

// SQL commands for ActivityTable
// getOneDB and allDB are used as testers. I don't include any userid handlers in them
const insertDB = "insert into ActivityTable (userid, activity, date, amount) values (?,?,?,?)"
const deletePrevPlannedDB = "DELETE FROM ActivityTable WHERE amount < 0 and date BETWEEN ? and ? and userid = ?";
const getMostRecentPrevPlannedDB = "SELECT rowIdNum, activity, MAX(date), amount FROM ActivityTable WHERE amount <= 0 and date BETWEEN ? and ? and userid = ?";
const getMostRecentDB = "SELECT MAX(rowIdNum), activity, date, amount FROM ActivityTable WHERE userid = ?";
const getPastWeekByActivityDB = "SELECT * FROM ActivityTable WHERE activity = ? and date BETWEEN ? and ? and userid = ? ORDER BY date ASC";
// these are used in testDB (not important)
const getOneDB = "select * from ActivityTable where userid = ? and activity = ? and date = ?";
const allDB = "select * from ActivityTable where activity = ?";
// SQL commands for Profile
const insertProfileEntry = "INSERT into Profile (userid, name) values (?,?)";
const getNameFromUserID = "SELECT * from Profile where userid = ?";
const remove_profile_entry_user_id = "DELETE FROM Profile where userid = ?"
const remove_profile_entry_name = "DELETE FROM Profile where name = ?";
const remove_all_profile_entries = "DELETE * FROM Profile";
const checkID = "SELECT EXISTS(SELECT * FROM Profile WHERE userid = ?)";

// Testing function loads some data into DB. 
// Is called when app starts up to put fake 
// data into db for testing purposes.
// Can be removed in "production". 
async function testDB () {
  // for testing, always use today's date
  const today = new Date().getTime();
  // all DB commands are called using await
  // empty out database - probably you don't want to do this in your program
  await db.deleteEverything(); // <- ONLY USING THIS FOR TESTING!
  // const MS_IN_DAY = 86400000
  // let newDate =  new Date(); // today!
  // let startDate = newDate.getTime() - 7 * MS_IN_DAY;
  // let planDate3 = newDate.getTime() - 3 * MS_IN_DAY;
  // let planDate2 = newDate.getTime() - 2 * MS_IN_DAY;
  // console.log("today:", startDate)
  
  // let dbData = [
  //   {
  //     type: 'walk',
  //     data: Array.from({length: 8}, () => randomNumber(0,1)),
  //     start: startDate
  //   },
  //   {
  //     type: 'run',
  //     data: Array.from({length: 8}, () => randomNumber(1,3)),
  //     start: startDate
  //   },
  //   {
  //     type: 'swim',
  //     data: Array.from({length: 8}, () => randomNumber(30, 100, false)),
  //     start: startDate
  //   },
  //   {
  //     type: 'bike',
  //     data: Array.from({length: 8}, () => randomNumber(5,10)),
  //     start: startDate
  //   },
  //   {
  //     type: 'yoga',
  //     data: Array.from({length: 8}, () => randomNumber(30,120,false)),
  //     start: startDate
  //   },
  //   {
  //     type: 'soccer',
  //     data: Array.from({length: 8}, () => randomNumber(120,180,false)),
  //     start: startDate
  //   },
  //   {
  //     type: 'basketball',
  //     data: Array.from({length: 8}, () => randomNumber(60,120,false)),
  //     start: startDate
  //   },
  // ]
  
  // for(const entry of dbData) {
  //   for(let i = 0 ; i < entry.data.length; i++) {
  //     await db.run(insertDB,[0, entry.type, entry.start + i * MS_IN_DAY, entry.data[i]]);
  //   }
  // }
  

  // await db.run(insertDB,[0, "yoga", planDate2, -1]);
  // await db.run(insertDB,[0, "yoga", planDate3, -1]);
  // await db.run(insertDB,[0, "run", planDate2, -1]);

  // // some examples of getting data out of database
  
  // // look at the item we just inserted
  // let result = await db.get(getOneDB,["run",startDate]);
  // console.log("sample single db result",result);
  
  // // get multiple items as a list
  // result = await db.all(allDB,["walk"]);
  // console.log("sample multiple db result",result);
}

/**
 * Insert activity into the database
 * @param {Activity} activity 
 * @param {string} activity.activity - type of activity
 * @param {number} activity.date - ms since 1970
 * @param {float} activity.scalar - measure of activity conducted
 */
async function post_activity(user_id, activity) {
  try {
    await db.run(insertDB, act.ActivityToList(user_id, activity));
  } catch (error) {
    console.log("error HERE DUDE!!!!", error)
  }
}


/**
 * Get the most recently planned activity that falls within the min and max 
 * date range
 * @param {number} min - ms since 1970
 * @param {number} max - ms since 1970
 * @returns {Activity} activity 
 * @returns {string} activity.activity - type of activity
 * @returns {number} activity.date - ms since 1970
 * @returns {float} activity.scalar - measure of activity conducted
 */
async function get_most_recent_planned_activity_in_range(user_id, min, max) {
  try {
    let results = await db.get(getMostRecentPrevPlannedDB, [min, max, user_id]);
    return (results.rowIdNum != null) ? results : null;
  }
  catch (error) {
    console.log("error", error);
    return null;
  }
}



/**
 * Get the most recently inserted activity in the database
 * @returns {Activity} activity 
 * @returns {string} activity.activity - type of activity
 * @returns {number} activity.date - ms since 1970
 * @returns {float} activity.scalar - measure of activity conducted
 */


async function get_most_recent_entry(user_id) {
  try {
    console.log("entered get_most_recent_entry")
    let result = await db.get(getMostRecentDB, [user_id]);
    return (result['MAX(rowIdNum)'] != null) ? result : null;
  }
  catch (error) {
    console.log(error);
    return null;
  }
}


/**
 * Get all activities that have the same activityType which fall within the 
 * min and max date range
 * @param {string} activityType - type of activity
 * @param {number} min - ms since 1970
 * @param {number} max - ms since 1970
 * @returns {Array.<Activity>} similar activities
 */
async function get_similar_activities_in_range(user_id, activityType, min, max) {
  try {
    let results = await db.all(getPastWeekByActivityDB, [activityType, min, max, user_id]);
    return results;
  }
  catch (error) {
    console.log(error);
    return [];
  }
}


/**
 * Delete all activities that have the same activityType which fall within the 
 * min and max date range
 * @param {number} min - ms since 1970
 * @param {number} max - ms since 1970
 */
async function delete_past_activities_in_range(user_id, min, max) {
  try {
    await db.run(deletePrevPlannedDB, [min, max, user_id]);
  }
  catch (error) {
    console.log(error);
  }
}
// ***PROFILE TABLE FUNCS***

/** TODO: Call me to add my entry to the profile table
 * @param {number} user_id: user's ID from google login
 * @param {string} user_name: name of user from google login 
 */
async function add_entry_to_profile(user_id, user_name) {
  try {
    console.log("ADDENTRYTOPROFILEHERE",typeof(user_id), user_id);
    await db.run(insertProfileEntry, [user_id, user_name]);
  }
  catch (error) {
    console.log(error);
  }
}

/** TODO: Call me return an entry from the profile table,
 * USE THIS FOR THE /name post request
 * Use profile table to lookup name from userid
 * @param {number} user_id: user's ID from google login 
 */
async function get_userData_from_id(user_id) { 
  try {
    let result = await db.get(getNameFromUserID, [user_id]);
    // console.log("***RESULT***",result)
    return result;
  }
  catch (error) {
    console.log(error);
    return [];
  }
}

/* TODO: Check if ID exists in table
 */
async function check_if_user_exists(user_id) { 
  try {
    let result = await db.get(checkID, [user_id]);
    // returns 1 if exists, 0 if not.
    return result['EXISTS(SELECT * FROM Profile WHERE userid = ?)'];
  }
  catch (error) {
    console.log(error);
    return 0;
  }
}

// ***UNORGANIZED HELPER FUNCTIONS for PROFILE***
/**
 * @param {number} user_id: user's ID from google login
 * @param {string} user_name: name of user from google login
 * If user_id is null, take user_name and vice versa. If both are null
 * erase the entire table's contents
 */
async function remove_entries_from_profile(user_id, user_name) {
  try {
    if (user_id === null && user_name === null) {
      // remove all
      await db.run(remove_all_profile_entries, [])
    }
    else if (user_id === null) {
      // go by user_name
      await db.run(remove_profile_entry_name, [user_name])
    }
    else {
      // go by user_id
      await db.run(remove_profile_entry_user_id, [user_id])
    }
  }
  catch (error) {
    console.log(error);
  }
}

/**
 * Convert GMT date to UTC
 * @returns {Date} current date, but converts GMT date to UTC date
 */
function newUTCTime() {
  let gmtDate = new Date()
  return (new Date(gmtDate.toLocaleDateString())).getTime()
}

function randomNumber(min, max, round = true) { 
  let val =  Math.random() * (max - min) + min
  if (round) {
    return Math.round(val * 100) / 100
  } else {
    return Math.floor(val)
  }
}

// dumps whole table; useful for debugging
async function get_all() {
  try {
    let results = await db.all("select * from ActivityTable", []);
    return results;
  } 
  catch (error) {
    console.log(error);
    return [];
  }
}

// dumps whole PROFILE table; useful for debugging
async function get_all_profiles() {
  try {
    let results = await db.all("select * from Profile", []);
    return results;
  } 
  catch (error) {
    console.log(error);
    return [];
  }
}