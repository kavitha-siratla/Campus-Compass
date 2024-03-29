import bcrypt from "bcrypt";
import { ObjectId } from "mongodb";
import { events, locations, users } from "../config/mongoCollections.js";
import validations from "../validate.js";

const passwordEncryptRounds = 10;

const exportedMethods = {
  async createUser(name, emailid, password, role = "student") {
    let usersCollection = await users();
    name = validations.checkString(name, "User Name");
    emailid = validations.checkStevensMail(emailid);
    password = validations.checkPassword(password);

    let hashpassword = await bcrypt.hash(password, passwordEncryptRounds);
    role = validations.checkString(role, "User Role");

    if (role.toLowerCase() !== "admin" && role.toLowerCase() !== "student")
      throw new Error(`Improper User Role`);
    const date = new Date();
    date.setTime(date.getTime() + -240 * 60 * 1000);

    const checkIfUserExists = await usersCollection.findOne(
      { emailid },
      { projection: { _id: 1 } }
    );

    if (checkIfUserExists) throw new Error(`User already Exists in Database!`);
    let newUser = {
      role,
      emailid,
      name,

      hashedpassword: hashpassword,
      events: [],
      lastupdatedDate: date,
    };
    let userInsertedInfo = await usersCollection.insertOne(newUser);
    if (!userInsertedInfo.acknowledged || !userInsertedInfo.insertedId)
      throw new Error(`Could not Create User`);

    return {
      user_id: userInsertedInfo.insertedId.toString(),
      usercreated: true,
    };
  },

  async checkUser(emailid, password) {
    emailid = validations.checkStevensMail(emailid);
    password = validations.checkString(password);
    let usersCollection = await users();
    let dbUser = await usersCollection.findOne(
      { emailid },
      {
        projection: { _id: 1, name: 1, emailid: 1, hashedpassword: 1, role: 1 },
      }
    );
    if (!dbUser) throw new Error(`Either email or password is invalid`);

    if (!(await bcrypt.compare(password, dbUser.hashedpassword)))
      throw new Error(`Either email or password is invalid`);
    return {
      userAuthenticatedID: dbUser._id.toString(),
      userAuthenticated: true,
      username: dbUser.name,
      userRole: dbUser.role,
      userEvents: dbUser.events,
    };
  },
  async checkIfEmailExists(emailid) {
    emailid = validations.checkStevensMail(emailid);
    let usersCollection = await users();
    let dbUser = await usersCollection.findOne(
      { emailid },
      { projection: { _id: 1, emailid: 1, name: 1 } }
    );
    if (dbUser) return true;
    return false;
  },

  async getRegisteredEventsID(userid) {
    userid = validations.checkId(userid);
    let usersCollection = await users();
    let dbUser = await usersCollection.findOne(
      { _id: new ObjectId(userid) },
      { projection: { _id: 1, emailid: 1, events: 1 } }
    );
    if (!dbUser) throw new Error(`No User for UserID: ${userid}`);
    let eventList = dbUser.events;

    for (let i = 0; i < eventList.length; i++)
      eventList[i] = new ObjectId(eventList[i]);

    let eventCollection = await events();
    let locationCollection = await locations();
    const currentDate = new Date();
    const currentDateEst = new Date(currentDate.getTime() + -5 * 60 * 1000);
    const estTimezone = "America/New_York";
    const currentDateTime = new Date().toLocaleString("en-US", {
      timeZone: estTimezone,
    });
    let currentDay =
      currentDateEst.getDay() === 0 ? 7 : currentDateEst.getDay();
    let locationRender = [];
    let userEvents = await eventCollection
      .find(
        {
          _id: { $in: eventList },
          // "event_date.1": {
          //   $gte: new Date(currentDateTime).toISOString().slice(0, 10),
          // },
          "event_date.2": { $in: [0, currentDay] },
        },
        { projection: { desc: 0, lastupdatedDate: 0, created_by: 0 } }
      )
      .toArray();

    for (let i = 0; i < userEvents.length; i++) {
      userEvents[i].hours = `${validations.formatTime(
        userEvents[i].hours[0]
      )} to ${validations.formatTime(userEvents[i].hours[1])}`;
      let room_id, building_id;
      building_id = userEvents[i].location_id[0];
      if (userEvents[i].location_id.length == 2)
        room_id = userEvents[i].location_id[1];

      let location = await locationCollection.findOne(
        {
          _id: new ObjectId(building_id),
        },
        { projection: { _id: 1, name: 1, rooms: 1, location: 1 } }
      );

      if (!location) return;

      let tempGeo = {
        type: "Feature",
        geometry: location.location,
        properties: { popupContent: location.name },
      };

      locationRender.push(tempGeo);

      if (room_id) {
        location.rooms = location.rooms.filter((room) => {
          return room._id.toString() === room_id;
        });
        location.rooms = location.rooms[0];
      }
      userEvents[i]["Location_details"] = location;
      if (userEvents[i]["Location_details"])
        userEvents[i]["Location_details"]._id =
          userEvents[i]["Location_details"]._id.toString();
      let tempDate;
      if (userEvents[i]["event_date"][2] === 0)
        tempDate = new Date(currentDateEst.getTime() + 1 * 24 * 60 * 60 * 1000);
      else
        tempDate = new Date(
          currentDateEst.getTime() +
            userEvents[i]["event_date"][2] * 24 * 60 * 60 * 1000
        );

      userEvents[i]["next_occurence_date"] =
        currentDateEst < tempDate
          ? new Date(
              `${userEvents[i]["event_date"][1]} ${userEvents[i]["hours"][1]}`
            )
          : tempDate;
    }
    userEvents.sort((a, b) => {
      return a.next_occurence_date - b.next_occurence_date;
    });
    return { locationData: locationRender, eventsData: userEvents };
  },

  //needs more code
  async registerEvents(userid, event_id) {
    userid = validations.checkId(userid);
    event_id = validations.checkId(event_id);

    const date = new Date();
    date.setTime(date.getTime() + -240 * 60 * 1000);

    let usersCollection = await users();
    let dbUser = await usersCollection.findOne(
      { _id: new ObjectId(userid) },
      { projection: { _id: 1, emailid: 1, events: 1 } }
    );
    if (!dbUser) throw new Error(`No User for UserID: ${userid}`);
    if (dbUser.events.length < 0 || !dbUser.events.includes(event_id))
      dbUser = await usersCollection.updateOne(
        {
          _id: new ObjectId(userid),
        },
        {
          $push: { events: event_id },
        },
        { $set: { lastupdatedDate: date } }
      );

    if (!dbUser.acknowledged || dbUser.modifiedCount !== 1)
      throw new Error("DB Error");
    return { eventID: event_id, registered: true };
  },
};

export default exportedMethods;
