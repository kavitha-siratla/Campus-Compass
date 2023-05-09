import { ObjectId } from "mongodb";
import { events } from "../config/mongoCollections.js";
import validation from "../validate.js";
import notifications from "../data/notification.js"


const exportedMethods = {
  async getById(id) {
    id = validation.checkId(id, "eventID");
    const eventsCollection = await events();
    const event = await eventsCollection.findOne({
      _id: new ObjectId(id),
    });
    if (event === null) throw "No event found with that Id";
    event._id = event._id.toString();
    return event;
  },

  async create(name, desc, type, event_date, hours, created_by, location_id) {
    // ERROR HANDLING & INPUT VALIDATIONS //
    name = validation.checkString(name, "event Name");
    desc = validation.checkString(desc, "Description");
    type = validation.checkString(type, "event Type");
    event_date = validation.checkStringArray(event_date, "event Date", 3);
    hours = validation.checkStringArray(hours, "Hours", 2);
    created_by = validation.checkId(created_by, "Created By");
    location_id = validation.checkId(location_id, "Location ID");

    const lastupdatedDate = new Date();
    lastupdatedDate.setTime(lastupdatedDate.getTime() + -240 * 60 * 1000);

    let newevent = {
      name: name,
      desc: desc,
      type: type,
      event_date: event_date,
      hours: hours,
      created_by: created_by,
      location_id: location_id,
      lastupdatedDate: lastupdatedDate,
    };

    const eventsCollection = await events();
    const insertInfo = await eventsCollection.insertOne(newevent);
    if (!insertInfo.acknowledged || !insertInfo.insertedId) {
      throw "Could not add event";
    }

    let notificationTitle = "New Event Alert!";
    let notificationDetails = `New event ${newevent.name} has been created.`;
    let notificationDesc = `The new event ${newevent.name} - ${newevent.desc} will be scheduled on ${newevent.event_date[0]} with timings from ${newevent.hours[0]} to ${newevent.hours[1]}.`;

    let newNotification = await notifications.create(notificationTitle, notificationDesc, notificationDetails);
    
    const newId = insertInfo.insertedId.toString();
    const event = await this.getById(newId);
    return event;
  },

  async getAll() {
    const eventsCollection = await events();
    let eventsList = await eventsCollection.find({}).toArray();
    if (!eventsList) throw "Could not get all events";
    eventsList = eventsList.map((element) => {
      element._id = element._id.toString();
      return element;
    });
    return eventsList;
  },

  async update(id, name, desc, type, event_date, hours, created_by, location_id) {
    // ERROR HANDLING & INPUT VALIDATIONS //
    id = validation.checkId(id, "eventID");
    name = validation.checkString(name, "event Name");
    desc = validation.checkString(desc, "Description");
    type = validation.checkString(type, "event Type");
    event_date = validation.checkStringArray(event_date, "event Date", 3);
    hours = validation.checkStringArray(hours, "Hours", 2);
    created_by = validation.checkId(created_by, "Created By");
    location_id = validation.checkId(location_id, "Location ID");

    const lastupdatedDate = new Date();
    lastupdatedDate.setTime(lastupdatedDate.getTime() + -240 * 60 * 1000);

    const updatedevent = {
      name: name,
      desc: desc,
      type: type,
      event_date: event_date,
      hours: hours,
      created_by: created_by,
      location_id: location_id,
      lastupdatedDate: lastupdatedDate,
    };

    const eventsCollection = await events();
    const event = await eventsCollection.findOne({
      _id: new ObjectId(id),
    });
    if (event === null) throw "No event found with given Id";
    const updatedInfo = await eventsCollection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: updatedevent },
      { returnDocument: "after" }
    );
    if (updatedInfo.lastErrorObject.n === 0)
      throw "Could not update event successfully !";
    if(event.hours[0] !== updatedInfo.value.hours[0] || event.hours[1] !== updatedInfo.value.hours[1] || event.location_id !== updatedInfo.value.location_id){
      let notificationTitle = "Event update";
      let notificationDesc = `Updated the event ${event.name}`;
      let  notificationDetails = "";

      if(event.event_date !== updatedInfo.value.event_date){
        notificationDetails = notificationDetails+`The event has been moved from "${event.event_date[0]}-${event.event_date[1]}" to "${updatedInfo.value.event_date[0]}-${updatedInfo.value.event_date[0]}"`;
      }
      if(event.hours !== updatedInfo.value.hours){
        notificationDetails = notificationDetails+`The event timings have been modified from "${event.hours[0]}-${event.hours[1]}" to "${updatedInfo.value.hours[0]}-${updatedInfo.value.hours[0]}"`;
      }
      else if(event.location_id !== updatedInfo.value.location_id){
        notificationDetails = notificationDetails+` The location of has been updated from "${event.location_id}" to "${updatedInfo.value.location_id}".`;
      }
      let newNotification = notifications.create(notificationTitle, notificationDesc, notificationDetails);
    
    }
    
    updatedInfo.value._id = updatedInfo.value._id.toString();
    return updatedInfo.value;
  },

  async remove(id) {
    id = validation.checkId(id, "eventID");
    const eventsCollection = await events();
    const deletionInfo = await eventsCollection.findOneAndDelete({
      _id: new ObjectId(id),
    });
    if (deletionInfo.lastErrorObject.n === 0) {
      throw `Could not delete event with given id`;
    }
    return `'${deletionInfo.value.name}' has been successfully deleted!`;
  },
  async getEventsAll() {
    const eventCollection = await events();
    const eventList = await eventCollection
      .find(
        {},
        {
          projection: {
            _id: 1,
            name: 1,
            type: 1,
            hours: 1,
          },
        }
      )
      .toArray();
    eventList.map((event) => {
      event._id = event._id.toString();
    });
    return eventList;
  },
  async search(key) {
    const eventsCollection = await events();
    let eventsList = await eventsCollection
      .find({
        $or: [
          { name: { $regex: key, $options: "i" } },
          { type: { $regex: key, $options: "i" } },
        ],
      })
      .toArray();
    if (!eventsList) throw "Not Found";
    eventsList = eventsList.map((element) => {
      element._id = element._id.toString();
      return element;
    });
    return eventsList;
  },
};

export default exportedMethods;
