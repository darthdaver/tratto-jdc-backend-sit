const User = require('../../models/User').User;
async function getUser(req, res, next) {
    let user
    try {
        console.log("entro");
        user = await User.findById(req.params.idUser);
        if (user == null) {
            return res.status(404).json({ message: "Cannot find User." });
        }
    } catch (e) {
        return res.status(500).json({ message: e.message });
    }
    res.user = user;
    next();
}

exports.getUser = getUser;