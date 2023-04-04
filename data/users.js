import { users } from "../config/mongoCollections.js";
import bcrypt from "bcrypt";
import { ObjectId } from "mongodb";
import validations from "../validate.js";

const passwordEncryptRounds = 10;

const exportedMethods = {
  async createUser(name, emailid, password, department, role = "student") {
    let usersCollection = await users();
    name = validations.checkString(name, "User Name");
    emailid = validations.checkStevensMail(emailid);
    password = validations.checkString(password, "Password");
    department = validations.checkString(department, "Department");
    let hashpassword = await bcrypt.hash(password, passwordEncryptRounds);
    role = validations.checkString(role, "User Role");
    const date = new Date();
    date.setTime(date.getTime() + -240 * 60 * 1000);
    console.log(hashpassword);

    const checkIfUserExists = await usersCollection.findOne(
      { emailid },
      { projection: { _id: 1 } }
    );

    if (checkIfUserExists) throw new Error(`User already Exists in Database!`);
    let newUser = {
      role,
      emailid,
      name,
      department,
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
      { projection: { _id: 1, emailid: 1, hashedpassword: 1 } }
    );
    if (!dbUser) throw new Error(`Either email or password is invalid`);
  },
};

export default exportedMethods;
