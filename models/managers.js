const { Sequelize, DataTypes } = require("sequelize");
const db = require("../config/database").conn;
const utils = require("../utils/employees");

const Manager = db.define("manager", {
  uuid: {
    type: DataTypes.UUID,
    defaultValue: Sequelize.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notNull: {
        args: true,
        msg: "Name must be provided",
      },
    },
  },
  email: {
    type: DataTypes.STRING,
    unique: {
      args: true,
      msg: "Email already exists",
    },
    allowNull: false,
    validate: {
      isEmail: {
        args: true,
        msg: "Email is not a valid email",
      },
    },
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notNull: {
        args: true,
        msg: "Password must be provided",
      },
    },
  },
  status: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isIn: {
        args: [["active", "inactive"]],
        msg: "Must be Active or Inactive",
      },
    },
  },
  nid: {
    type: DataTypes.BIGINT,
    allowNull: false,
    unique: true,
    validate: {
      len: {
        args: [16, 16],
        msg: "Nid must be a valid Rwandan National ID",
      },
    },
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      is: {
        args: /^(25)?0?7[3 2 8]{1}[0-9]{7}$/,
        msg: "Phone number must be a valid Rwandan Phone",
      },
    },
  },
  position: {
    type: DataTypes.STRING,
    defaultValue: "manager",
  },
  birthday: {
    type: DataTypes.DATE,
    allowNull: false,
    validate: {
      isDate: {
        args: true,
        msg: "Birthday must be a valid date (timestamp)",
      },
      ageRestriction() {
        if (this.birthday) {
          if (utils.checkAge(this.birthday) < 18) {
            throw new Error("Employee must be atleast 18 yrs old.");
          }
        }
      },
    },
  },
  confirmed: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
});

module.exports = Manager;
