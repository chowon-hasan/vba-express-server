const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
const dotenv = require("dotenv");
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const PORT = process.env.PORT || 7000;

app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret";

// MongoDB URI
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@vba-laboiteautomatique.5j1p4.mongodb.net/?retryWrites=true&w=majority&appName=VBA-laboiteautomatique`;

// MongoDB client setup
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();
    const CarsModel = client
      .db("VBA-laboiteautomatique-DB")
      .collection("carsModel");
    const RefModel = client
      .db("VBA-laboiteautomatique-DB")
      .collection("refModel");
    const Admin = client.db("VBA-laboiteautomatique-DB").collection("admin");

    // Authentication Middleware
    const authenticateToken = (req, res, next) => {
      const token = req.headers["authorization"]?.split(" ")[1];
      if (!token) return res.status(401).json({ error: "Access denied" });

      jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: "Invalid token" });
        req.user = user;
        next();
      });
    };

    // Route to get all cars
    app.get("/cars", async (req, res) => {
      console.log("GET /cars route accessed"); // Debug log
      try {
        const cars = await CarsModel.find().toArray(); // Direct fetch without cache
        console.log(cars);
        res.json(cars);
      } catch (error) {
        console.error("Error fetching cars:", error.message);
        res.status(500).json({ error: "Failed to fetch cars" });
      }
    });

    // Route to update stock for a specific car type (diesel or essence)
    app.put("/cars/:model/:type", async (req, res) => {
      const { model, type } = req.params;
      const { stock } = req.body;

      console.log("Received Model:", model); // Debug log
      console.log("Received Type:", type); // Debug log
      console.log("Received Stock:", stock); // Debug log

      try {
        const result = await CarsModel.updateOne(
          { model },
          { $set: { [`types.${type}.stock`]: stock } }
        );

        console.log("Update Result:", result); // Debug log

        if (result.modifiedCount === 1) {
          res.status(200).json({ message: "Stock updated successfully" });
        } else {
          res.status(404).json({ message: "Car or type not found" });
        }
      } catch (error) {
        console.error("Error updating stock:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
      }
    });

    // Route to get all refs
    app.get("/refs", async (req, res) => {
      try {
        const refs = await RefModel.find().toArray(); // Direct fetch without cache
        res.status(200).json(refs);
      } catch (error) {
        console.error("Error fetching refs:", error.message);
        res.status(500).json({ error: "Failed to fetch refs" });
      }
    });

    // Route to update stock for a specific ref code
    app.put("/refs/:id", async (req, res) => {
      const { id } = req.params;
      const { stock } = req.body;

      console.log(`Received Stock for Ref ID ${id}:`, stock); // Debug log

      if (typeof stock !== "number" || stock < 0) {
        return res.status(400).json({ message: "Invalid stock value" });
      }

      try {
        const result = await RefModel.updateOne(
          { _id: new ObjectId(id) },
          { $set: { stock } }
        );

        console.log("MongoDB Update Result:", result); // Debug log

        if (result.modifiedCount === 1) {
          res.status(200).json({ message: "Stock updated successfully" });
        } else {
          res.status(404).json({ message: "Ref code not found" });
        }
      } catch (error) {
        console.error("Error updating ref stock:", error.message);
        res.status(500).json({ error: "Failed to update stock" });
      }
    });

    // Login Route
    app.post("/login", async (req, res) => {
      const { email, pass } = req.body;

      try {
        console.log("Received email:", email);
        console.log("Received password:", pass);

        const admin = await Admin.findOne({ email });

        if (!admin) {
          console.log("No admin found with this email.");
          return res.status(401).json({ error: "Invalid credentials" });
        }

        console.log("Admin found:", admin);

        const isMatch = pass === admin.pass;

        if (!isMatch) {
          console.log("Password mismatch.");
          return res.status(401).json({ error: "Invalid credentials" });
        }

        res.status(200).json({ message: "Login successful" });
      } catch (error) {
        console.error("Login error:", error.message);
        res.status(500).json({ error: "Login failed" });
      }
    });

    // Confirm MongoDB connection
    await client.db("admin").command({ ping: 1 });
    console.log("Connected to MongoDB!");
  } catch (error) {
    console.error("Error connecting to MongoDB:", error.message);
  }
}
run().catch(console.dir);

// Home route
app.get("/", (req, res) => {
  res.send("Welcome to My Express Server with MongoDB!");
});
app.get("/test", (req, res) => {
  res.send("Test route is working");
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
