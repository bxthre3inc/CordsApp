const User = require('../models/User');

class UserController {
  static async getProfile(req, res) {
    try {
      const { userId, role } = req.user;

      let user;
      if (role === 'supplier') {
        user = await User.getSupplierProfile(userId);
      } else if (role === 'buyer') {
        user = await User.getBuyerProfile(userId);
      } else {
        user = await User.findById(userId);
      }

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json(user);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch profile' });
    }
  }

  static async updateProfile(req, res) {
    try {
      const { userId } = req.user;
      const { firstName, lastName, phone, location, bio } = req.body;

      const user = await User.update(userId, {
        firstName,
        lastName,
        phone,
        location,
        bio
      });

      res.json({
        message: 'Profile updated successfully',
        user
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to update profile' });
    }
  }

  static async getById(req, res) {
    try {
      const { id } = req.params;
      const user = await User.findById(id);

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Don't return sensitive data
      delete user.password;
      res.json(user);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch user' });
    }
  }
}

module.exports = UserController;
