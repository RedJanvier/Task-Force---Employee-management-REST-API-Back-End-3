import { conn as db } from '../config/database';
import Manager from '../models/managers';
import {
  encryptPassword,
  sendEmail,
  managerLog,
  verifyToken,
  decryptPassword,
  signToken,
} from '../utils/employees';

// @desc    Create a manager
// Route    POST /api/v1/managers/signup
// Access   Public
export const create = (req, res) => {
  db.sync({ logging: false })
    .then(async () => {
      try {
        const manager = await Manager.create({
          ...req.body,
          password: await encryptPassword(req.body.password),
        });
        await sendEmail('confirmation', manager.dataValues.email);

        managerLog('create', {
          manager: req.decoded.name,
          employee: manager.dataValues.name,
        });

        return res.status(201).json({
          success: true,
          message: `Please check your inbox to confirm your email!`,
        });
      } catch (error) {
        console.log(error);
        return res.status(400).json({
          success: false,
          message: error.errors[0].message,
        });
      }
    })
    .catch((err) => {
      console.log(err);
      res.status(500).json({
        success: false,
        message: 'Manager not created',
      });
    });
};

// @desc    Confirm a manager from email
// Route    GET /api/v1/managers/confirm/:confirmationToken
// Access   Private
export const confirm = async (req, res) => {
  const { confirmationToken } = req.params;
  const email = verifyToken(
    confirmationToken,
    process.env.JWT_CONFIRMATION_SECRET
  );

  db.sync({ logging: false })
    .then(async () => {
      try {
        const manager = await Manager.update(
          { confirmed: true },
          {
            where: { email },
          }
        );

        if (!manager[0]) {
          throw new Error(`Manager's email not confirmed`);
        }

        await sendEmail('communication', email);

        await res.status(200).json({
          success: true,
          message: `Thank you for confirming your email!`,
        });
      } catch (error) {
        await res.status(304).json({
          success: false,
          message: error.message,
        });
      }
    })
    .catch((err) => {
      console.log(err);
      res.status(500).json({
        success: false,
        message: 'Error occurred on the server; Email not confirmed',
      });
    });
};

// @desc    Login a manager
// Route    POST /api/v1/managers/login
// Access   Public
export const login = async (req, res) => {
  const { email, password } = req.body;

  db.sync({ logging: false })
    .then(async () => {
      try {
        let token;
        const manager = await Manager.findOne({ where: { email } });

        if (!manager.dataValues) {
          throw new Error(`Manager doesn't exist!`);
        }
        if (!manager.dataValues.confirmed) {
          throw new Error(`Please verify your email to login`);
        }
        const isValid = await decryptPassword(
          password,
          manager.dataValues.password
        );
        if (isValid) {
          token = signToken(
            {
              name: manager.dataValues.name,
              uuid: manager.dataValues.uuid,
              email: manager.dataValues.email,
              status: manager.dataValues.status,
            },
            process.env.JWT_LOGIN_SECRET,
            '3h'
          );
        } else {
          throw new Error('Email or Password incorrect!');
        }

        managerLog('login', { manager: manager.dataValues.name });

        return res.status(200).json({
          success: true,
          data: token,
        });
      } catch (error) {
        console.log(error);
        return res.status(500).json({
          success: false,
          data: error.message,
        });
      }
    })
    .catch((err) => {
      console.log(err);
      res.status(500).json({
        success: false,
        message: 'Error occurred on the server;',
      });
    });
};

// @desc    Request to reset a manager's Password
// Route    POST /api/v1/managers/reset
// Access   Public
export const requestReset = (req, res) => {
  db.sync({ logging: false })
    .then(async () => {
      const { email } = req.body;
      const manager = await Manager.findOne({ where: { email } });

      if (!manager.dataValues.email) {
        throw new Error(`Unable to reset manager's password!`);
      }

      await sendEmail('password reset', manager.dataValues.email);

      return res.status(201).json({
        success: true,
        message: `Please check your inbox to reset your password!`,
      });
    })
    .catch((err) => {
      console.log(err);
      res.status(500).json({
        success: false,
        message: 'Unable to request a password reset',
      });
    });
};

// @desc    Confirm a manager's password reset
// Route    POST /api/v1/managers/reset/:token
// Access   Private
export const confirmReset = async (req, res) => {
  const newPassword = await encryptPassword(req.body.password);
  const email = verifyToken(
    req.params.token,
    process.env.JWT_CONFIRMATION_SECRET
  );

  db.sync({ logging: false })
    .then(async () => {
      const manager = await Manager.update(
        { password: newPassword },
        { where: { email } }
      );

      if (!manager[0]) {
        throw new Error(`Manager's password not reset`);
      }

      managerLog('reset', {
        manager: req.decoded.name,
      });

      return res.status(200).json({
        success: true,
        message: `Thank you! You can now use your new password to login!`,
      });
    })
    .catch((err) => {
      console.log(err);
      res.status(500).json({
        success: false,
        message: 'Error occurred on the server; Email not confirmed',
      });
    });
};