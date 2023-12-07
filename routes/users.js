const express = require('express');
const {getRepository} = require("./middlewares/repositories");
const {getUser} = require("./middlewares/users");
const router = express.Router();
const User = require('../models/User').User;
const Repository = require('../models/Repository').Repository;

router.post(
    '/signup',
    async (req, res) => {
        const users = await User.find();
        const usersDict = users.reduce((acc, u) => {
            acc[u.user.email] = u;
            return acc;
        }, {});
        if (!(req.body.email in usersDict)) {
            console.log(req.body)
            const user = new User({
                user: {
                    email: req.body.email,
                    password: req.body.password
                },
                repositories: req.body.repositories || []
            });
            try {
                // Save document to database
                await user.save();
                res.status(201).json(user);
            } catch (e) {
                res.status(400).json({message: e.message});
            }
        } else {
            res.status(400).json({message: "User already exists"});
        }
    }
);
router.post(
    '/signin',
    async (req, res) => {
        const users = await User.find();
        const usersDict = users.reduce((acc, u) => {
            acc[u.user.email] = u;
            return acc;
        }, {});
        try {
            if (!(req.body.email in usersDict)) {
                res.status(404).json({ error: "User not found" });
                return;
            }
            const user = usersDict[req.body.email];
            const repositories = await Repository.find({ _id: { $in: user.repositories } });
            res.status(200).json({
                user: user,
                repositories: repositories
            });
        } catch (e) {
            // Handle errors here
            console.error(e);
            res.status(500).json({ error: e.message });
        }
    }
);

router.post(
    '/:idUser/assign',
    getUser,
    async (req, res) => {
        const user = res.user;
        const repository = await Repository.findById(req.body._id);
        if (repository == null) {
            return res.status(404).json({ message: "Cannot find repository" });
        }
        if (user.repositories.includes(repository._id)) {
            res.status(400).json({ message: "User already assigned to this repository" });
            return;
        }
        user.repositories.push({
            id: repository._id,
            name: repository.projectName
        });
        try {
            await user.save();
            res.status(200).json(user);
        } catch (e) {
            res.status(500).json({ message: e.message });
        }
    }
);

exports.router = router;