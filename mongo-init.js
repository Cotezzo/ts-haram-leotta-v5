db.createUser(
        {
            user: "admin",
            pwd: "admin",
            roles: [
                {
                    role: "readWrite",
                    db: "haram_leotta_db"
                }
            ]
        }
);