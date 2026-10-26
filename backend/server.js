const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const User = require("./models/User");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
let policeAlertResolved = false;

// ============================================================
// SHARED AI DETECTION CACHE
// ============================================================

let latestDetectionData = null;
let lastDetectionTime = 0;
let detectionRequest = null;

const DETECTION_CACHE_TIME = 5000; // 5 seconds

// Stores recent AI detection snapshots for Reports & Analytics
const detectionHistory = [];

async function getLatestDetection() {

  const now = Date.now();

  // Return cached detection if it is still fresh
  if (
    latestDetectionData &&
    now - lastDetectionTime < DETECTION_CACHE_TIME
  ) {
    return latestDetectionData;
  }

  // If another request is already fetching AI data,
  // reuse that same request instead of creating another one.
  if (detectionRequest) {
    return detectionRequest;
  }

  detectionRequest = (async () => {

    try {

      const response = await fetch(
        "http://127.0.0.1:8000/detect"
      );

      if (!response.ok) {
        throw new Error(
          `AI service returned status ${response.status}`
        );
      }

      const data = await response.json();

      latestDetectionData = data;
      lastDetectionTime = Date.now();

      const detection = data.detection || {};

      // Save snapshot for Reports & Analytics
      detectionHistory.push({
        timestamp: new Date(),

        detection: {
          ambulances:
            detection.ambulances || 0,

          vehicles:
            detection.vehicles || 0,

          trafficDensity:
            detection.trafficDensity || "LOW",

          roadOccupancy:
            detection.roadOccupancy || 0,

          emergencyVehicleDetected:
            detection.emergencyVehicleDetected === true
        }
      });

      // Keep only the latest 100 snapshots
      if (detectionHistory.length > 100) {
        detectionHistory.shift();
      }

      return data;

    } finally {

      detectionRequest = null;

    }

  })();

  return detectionRequest;
}

// Test route
app.get("/", (req, res) => {
  res.json({
    message: "IntelliTraffic Backend is running successfully!"
  });
});

app.get("/api/ai-test", async (req, res) => {
  try {
    const response = await fetch("http://127.0.0.1:8000");

    const data = await response.json();

    res.json({
      status: "success",
      aiService: data
    });

  } catch (error) {
    console.error("AI service connection error:", error.message);

    res.status(500).json({
      status: "error",
      message: "Unable to connect to AI service."
    });
  }
});

app.get("/api/detection", async (req, res) => {

  try {

    const data = await getLatestDetection();

    res.json(data);

  } catch (error) {

    console.error(
      "Detection service connection error:",
      error.message
    );

    res.status(500).json({
      status: "error",
      message: "Unable to connect to AI detection service."
    });

  }

});
 
app.get("/api/traffic-signal", async (req, res) => {
  try {
   const data = await getLatestDetection();

const detection = data.detection || {};

    // ============================================================
    // TRAFFIC SIGNAL DECISION
    // ============================================================

    let signalStatus;
    let greenTime;
    let priority;

    if (detection.emergencyVehicleDetected) {

      signalStatus = "EMERGENCY PRIORITY";
      greenTime = 60;
      priority = "HIGH";

    } else if (detection.trafficDensity === "HIGH") {

      signalStatus = "HEAVY TRAFFIC";
      greenTime = 45;
      priority = "MEDIUM";

    } else if (detection.trafficDensity === "MEDIUM") {

      signalStatus = "MODERATE TRAFFIC";
      greenTime = 30;
      priority = "NORMAL";

    } else {

      signalStatus = "NORMAL TRAFFIC";
      greenTime = 20;
      priority = "NORMAL";
    }


    // ============================================================
    // JUNCTION DATA
    // ============================================================

    let junctions;

    if (detection.emergencyVehicleDetected) {

      junctions = {

        A: {
          status: "RED",
          timer: 15,
          traffic: "HIGH",
          mode: "AI CONTROL"
        },

        B: {
          status: "GREEN",
          timer: 60,
          traffic: detection.trafficDensity,
          mode: "EMERGENCY",
          emergency: true
        },

        C: {
          status: "GREEN",
          timer: 60,
          traffic: detection.trafficDensity,
          mode: "GREEN CORRIDOR",
          emergency: true
        },

        D: {
          status: "RED",
          timer: 20,
          traffic: "MEDIUM",
          mode: "AI CONTROL"
        }

      };

    } else {

      junctions = {

        A: {
          status: "RED",
          timer: 15,
          traffic: detection.trafficDensity,
          mode: "AI CONTROL"
        },

        B: {
          status: "RED",
          timer: 30,
          traffic: detection.trafficDensity,
          mode: "AI CONTROL"
        },

        C: {
          status: "YELLOW",
          timer: 8,
          traffic: detection.trafficDensity,
          mode: "AI CONTROL"
        },

        D: {
          status: "RED",
          timer: 20,
          traffic: detection.trafficDensity,
          mode: "AI CONTROL"
        }

      };
    }


    // ============================================================
    // SIGNAL COUNTS
    // ============================================================

    const activeSignals = Object.keys(junctions).length;

    const greenSignals = Object.values(junctions)
      .filter(junction => junction.status === "GREEN")
      .length;

    const redSignals = Object.values(junctions)
      .filter(junction => junction.status === "RED")
      .length;

    const emergencyPriority =
      detection.emergencyVehicleDetected ? 1 : 0;


    // ============================================================
    // ROUTE OPTIMIZATION
    // ============================================================

    const routeOptimization = {

      emergencyRoute:
        detection.emergencyVehicleDetected
          ? "Junction B → Junction C"
          : "Monitoring Traffic Routes",

      recommendedRoute:
        detection.emergencyVehicleDetected
          ? "Route A — Main Road"
          : "No Emergency Route Selected",

      reason:
        detection.emergencyVehicleDetected
          ? "Lowest traffic density and fastest estimated travel time"
          : "AI is monitoring traffic conditions",

      active:
        detection.emergencyVehicleDetected,

      // ==========================================================
      // ROUTE A
      // ==========================================================

      routes: {

        A: {

          name: "Route A — Main Road",

          path:
            "Junction B → Junction C → City Hospital",

          traffic: "LOW",

          distance: 4.2,

          estimatedTime: 7

        },


        // ========================================================
        // ROUTE B
        // ========================================================

        B: {

          name: "Route B — Ring Road",

          path:
            "Junction B → Ring Road → City Hospital",

          traffic: "MEDIUM",

          distance: 5.8,

          estimatedTime: 11

        },


        // ========================================================
        // ROUTE C
        // ========================================================

        C: {

          name: "Route C — Highway",

          path:
            "Junction B → Highway → Downtown → Hospital",

          traffic: "HIGH",

          distance: 7.1,

          estimatedTime: 16

        }

      },


      // ==========================================================
      // ROUTE SUMMARY
      // ==========================================================

      timeSaved: 9,

      currentLocation:
        detection.emergencyVehicleDetected
          ? "Junction B"
          : "Monitoring...",

      destination: "City Hospital",

      destinationType: "Emergency Department"

    };


    // ============================================================
    // FINAL RESPONSE
    // ============================================================

    res.json({

      status: "success",

      trafficSignal: {

        status: signalStatus,

        greenTime: greenTime,

        priority: priority,

        vehicles: detection.vehicles,

        ambulances: detection.ambulances,

        trafficDensity:
          detection.trafficDensity,

        emergencyVehicleDetected:
          detection.emergencyVehicleDetected,

        activeSignals: activeSignals,

        greenSignals: greenSignals,

        redSignals: redSignals,

        emergencyPriority:
          emergencyPriority,

        junctions: junctions,

        routeOptimization:
          routeOptimization

      }

    });

  } catch (error) {

    console.error(
      "Traffic signal service error:",
      error.message
    );

    res.status(500).json({

      status: "error",

      message:
        "Unable to calculate traffic signal decision."

    });

  }
});

// ============================================================
// HOSPITAL DATA
// ============================================================

const hospitals = [

  {
    id: 1,
    name: "City General Hospital",
    distance: 2.4,
    emergencyBeds: 18,
    status: "AVAILABLE",
    emergencyFacility: true,
    notified: false
  },

  {
    id: 2,
    name: "Metro Care Hospital",
    distance: 4.1,
    emergencyBeds: 9,
    status: "AVAILABLE",
    emergencyFacility: true,
    notified: false
  },

  {
    id: 3,
    name: "Sunrise Medical Center",
    distance: 6.8,
    emergencyBeds: 5,
    status: "LIMITED",
    emergencyFacility: true,
    notified: false
  },

  {
    id: 4,
    name: "Central Emergency Hospital",
    distance: 8.2,
    emergencyBeds: 0,
    status: "FULL",
    emergencyFacility: true,
    notified: false
  }

];


// ============================================================
// HOSPITALS API
// ============================================================

app.get("/api/hospitals", async (req, res) => {
  try {

    // ----------------------------------------------------------
    // Calculate hospital statistics
    // ----------------------------------------------------------

    const nearbyHospitals = hospitals.length;

    const emergencyBeds = hospitals.reduce(
      (total, hospital) =>
        total + hospital.emergencyBeds,
      0
    );

    const emergencyFacilities = hospitals.filter(
      hospital =>
        hospital.emergencyFacility === true
    ).length;


    // ----------------------------------------------------------
    // Select recommended hospital
    // ----------------------------------------------------------

    const availableHospitals = hospitals.filter(
      hospital =>
        hospital.status !== "FULL" &&
        hospital.emergencyBeds > 0
    );

    const recommendedHospital =
      availableHospitals.length > 0
        ? availableHospitals.reduce(
            (closest, hospital) =>
              hospital.distance < closest.distance
                ? hospital
                : closest
          )
        : null;


    // ----------------------------------------------------------
    // Response
    // ----------------------------------------------------------

    res.json({

      status: "success",

      hospitals: hospitals,

      recommendedHospital:
        recommendedHospital,

      statistics: {

        nearbyHospitals:
          nearbyHospitals,

        emergencyBeds:
          emergencyBeds,

        emergencyFacilities:
          emergencyFacilities,

        hospitalsNotified:
  hospitals.filter(hospital => hospital.notified).length

      }

    });

  } catch (error) {

    console.error(
      "Hospital API error:",
      error.message
    );

    res.status(500).json({

      status: "error",

      message:
        "Unable to fetch hospital information."

    });

  }
});

// ============================================================
// NOTIFY HOSPITAL API
// ============================================================

app.post("/api/hospitals/:id/notify", async (req, res) => {

  try {

    const hospitalId = parseInt(req.params.id);

    // Find hospital
    const hospital = hospitals.find(
      h => h.id === hospitalId
    );

    // Hospital not found
    if (!hospital) {

      return res.status(404).json({
        status: "error",
        message: "Hospital not found."
      });

    }

    // Hospital is full
    if (hospital.status === "FULL") {

      return res.status(400).json({
        status: "error",
        message: "Hospital is currently full."
      });

    }

    // Mark hospital as notified
    hospital.notified = true;

    res.json({

      status: "success",

      message:
        `${hospital.name} has been notified successfully.`,

      hospital: hospital

    });

  } catch (error) {

    console.error(
      "Hospital notification error:",
      error.message
    );

    res.status(500).json({

      status: "error",

      message:
        "Unable to notify hospital."

    });

  }

});

// ============================================================
// CANCEL HOSPITAL NOTIFICATION
// ============================================================

app.post("/api/hospitals/:id/cancel-notification", async (req, res) => {
  try {
    const hospitalId = parseInt(req.params.id);

    const hospital = hospitals.find(
      h => h.id === hospitalId
    );

    if (!hospital) {
      return res.status(404).json({
        status: "error",
        message: "Hospital not found."
      });
    }

    hospital.notified = false;

    res.json({
      status: "success",
      message: `${hospital.name} notification cancelled successfully.`,
      hospital: hospital
    });

  } catch (error) {
    console.error(
      "Cancel hospital notification error:",
      error.message
    );

    res.status(500).json({
      status: "error",
      message: "Unable to cancel hospital notification."
    });
  }
});
// ============================================================
// POLICE ALERTS API
// ============================================================

app.get("/api/police-alerts", async (req, res) => {

  try {

    // Get latest AI detection data
    const data = await getLatestDetection();

const detection = data.detection || {};

    // Check whether emergency vehicle is detected
    const emergencyDetected =
      detection.emergencyVehicleDetected === true;

      if (policeAlertResolved) {

  return res.json({

    status: "success",

    emergencyDetected: false,

    statistics: {
      activeAlerts: 0,
      policeUnits: 8,
      highPriority: 0,
      resolvedToday: 8
    },

    activeEmergency: null,

    recentAlerts: []

  });

}


    // ============================================================
    // NO ACTIVE EMERGENCY
    // ============================================================

    if (!emergencyDetected) {

      return res.json({

        status: "success",

        emergencyDetected: false,

        statistics: {

          activeAlerts: 0,

          policeUnits: 8,

          highPriority: 0,

          resolvedToday: 7

        },

        activeEmergency: null,

        recentAlerts: []

      });

    }


    // ============================================================
    // CURRENT TIME
    // ============================================================

    const currentTime = new Date().toLocaleTimeString(
      "en-IN",
      {
        hour: "2-digit",
        minute: "2-digit"
      }
    );


    // ============================================================
    // ACTIVE EMERGENCY RESPONSE
    // ============================================================

    res.json({

      status: "success",

      emergencyDetected: true,

      statistics: {

        activeAlerts: 1,

        policeUnits: 8,

        highPriority: 1,

        resolvedToday: 7

      },

      activeEmergency: {

        type: "Ambulance Emergency",

        location: "Junction B, Main Road",

        message:
          "Emergency vehicle requires police assistance for traffic clearance.",

        priority: "HIGH",

        unit: "Unit P-04",

        distance: 1.2,

        status: "RESPONDING",

        time: currentTime

      },

      recentAlerts: [

        {

          icon: "🚑",

          title: "Ambulance Priority Assistance",

          location: "Junction B → City Hospital",

          time: currentTime,

          status: "Responding"

        }

      ]

    });


  } catch (error) {

    console.error(
      "Police alerts service error:",
      error.message
    );

    res.status(500).json({

      status: "error",

      message:
        "Unable to fetch police alert information."

    });

  }

});

// ============================================================
// SEND POLICE ALERT API
// ============================================================

app.post("/api/police-alerts/send", async (req, res) => {

  try {

    // Get latest AI detection data
    const data = await getLatestDetection();

const detection = data.detection || {};

    const emergencyDetected =
      detection.emergencyVehicleDetected === true;


    // Do not send an alert if there is no emergency
    if (!emergencyDetected) {

      return res.status(400).json({

        status: "error",

        message:
          "No active emergency detected. Police alert cannot be sent."

      });

    }

policeAlertResolved = false;
    // Police alert successfully created
    res.json({

      status: "success",

      message:
        "Police alert sent successfully to Unit P-04.",

      alert: {

        type: "Ambulance Emergency",

        location: "Junction B, Main Road",

        unit: "Unit P-04",

        priority: "HIGH",

        status: "RESPONDING"

      }

    });


  } catch (error) {

    console.error(
      "Send police alert error:",
      error.message
    );

    res.status(500).json({

      status: "error",

      message:
        "Unable to send police alert."

    });

  }

});

// ============================================================
// MARK POLICE ALERT AS RESOLVED API
// ============================================================

app.post("/api/police-alerts/resolve", async (req, res) => {

  try {

    policeAlertResolved = true;

    res.json({

      status: "success",

      message:
        "Police alert marked as resolved successfully.",

      alert: {
        status: "RESOLVED"
      }

    });

  } catch (error) {

    console.error(
      "Resolve police alert error:",
      error.message
    );

    res.status(500).json({

      status: "error",

      message:
        "Unable to resolve police alert."

    });

  }

});

// ============================================================
// REPORTS & ANALYTICS API
// ============================================================

// ============================================================
// REPORTS & ANALYTICS API
// ============================================================

app.get("/api/reports", async (req, res) => {

  try {

    // --------------------------------------------------------
    // GET SHARED AI DETECTION DATA
    // --------------------------------------------------------

    const detectionData =
      await getLatestDetection();

    const detection =
      detectionData.detection || {};

    const emergencyDetected =
      detection.emergencyVehicleDetected === true;


    // --------------------------------------------------------
    // CURRENT TRAFFIC DATA
    // --------------------------------------------------------

    let trafficDensity =
      String(
        detection.trafficDensity || "LOW"
      ).toUpperCase();

    if (
      !["LOW", "MEDIUM", "HIGH"].includes(
        trafficDensity
      )
    ) {
      trafficDensity = "LOW";
    }

    const vehicles =
      detection.vehicles || 0;

    const ambulances =
      detection.ambulances || 0;

    const roadOccupancy =
      detection.roadOccupancy || 0;


    // --------------------------------------------------------
    // REPORT PERIOD
    // --------------------------------------------------------

    const period =
      req.query.period || "today";

    const now = new Date();

    let periodStart = new Date(now);

    if (period === "today") {

      periodStart.setHours(
        0,
        0,
        0,
        0
      );

    } else if (period === "week") {

      periodStart.setDate(
        periodStart.getDate() - 7
      );

    } else if (period === "month") {

      periodStart.setDate(
        periodStart.getDate() - 30
      );

    }


    // --------------------------------------------------------
    // FILTER AVAILABLE DETECTION HISTORY
    // --------------------------------------------------------

    const periodHistory =
      detectionHistory.filter(
        item =>
          item.timestamp >= periodStart
      );


    // --------------------------------------------------------
    // EMERGENCY VEHICLE COUNT
    // --------------------------------------------------------

    const emergencyVehicleSnapshots =
      periodHistory.filter(
        item =>
          item.detection
            .emergencyVehicleDetected === true
      );

    const emergencyVehicles =
      emergencyVehicleSnapshots.length;


    // --------------------------------------------------------
    // SIGNAL ACTIVATIONS
    // --------------------------------------------------------

    const signalActivations =
      emergencyVehicleSnapshots.length;


    // --------------------------------------------------------
    // GREEN CORRIDORS
    // --------------------------------------------------------

    const greenCorridors =
      emergencyVehicleSnapshots.length;


    // --------------------------------------------------------
    // POLICE ALERT
    // --------------------------------------------------------

    const policeAlerts =
      policeAlertResolved
        ? 0
        : emergencyDetected
          ? 1
          : 0;


    // --------------------------------------------------------
    // HOSPITAL NOTIFICATIONS
    // --------------------------------------------------------

    const hospitalsNotified =
      hospitals.filter(
        hospital =>
          hospital.notified === true
      ).length;


    // --------------------------------------------------------
    // DYNAMIC TRAFFIC HISTORY
    // --------------------------------------------------------

    const chartHistory =
      periodHistory.slice(-6);


    const trafficChart =
      chartHistory.map(item => {

        const time =
          item.timestamp.toLocaleTimeString(
            "en-IN",
            {
              hour: "2-digit",
              minute: "2-digit"
            }
          );

        return {

          time: time,

          density:
            item.detection.roadOccupancy || 0

        };

      });


    // --------------------------------------------------------
    // IF THERE IS NOT ENOUGH HISTORY
    // USE CURRENT LIVE VALUE
    // --------------------------------------------------------

    if (trafficChart.length === 0) {

      trafficChart.push({

        time:
          now.toLocaleTimeString(
            "en-IN",
            {
              hour: "2-digit",
              minute: "2-digit"
            }
          ),

        density: roadOccupancy

      });

    }


    // --------------------------------------------------------
    // RESPONSE PERFORMANCE
    // --------------------------------------------------------
    // We do not invent response times because the system
    // currently does not store actual emergency start/end times.
    // --------------------------------------------------------

    const responsePerformance = {

      efficiency:
        emergencyDetected
          ? 100
          : 0,

      averageTime:
        emergencyDetected
          ? "Monitoring"
          : "--",

      targetTime:
        "10:00 mins",

      improvement:
        "Live monitoring"

    };


    // --------------------------------------------------------
    // RECENT INCIDENTS
    // --------------------------------------------------------

    const incidents = [];


    if (emergencyDetected) {

      incidents.push({

        icon: "🚑",

        incident:
          "Ambulance Emergency",

        location:
          "Junction B",

        responseTime:
          "Monitoring",

        status:
          policeAlertResolved
            ? "Resolved"
            : "Active"

      });

    }


    if (
      !emergencyDetected &&
      policeAlertResolved
    ) {

      incidents.push({

        icon: "✅",

        incident:
          "Police Assistance Resolved",

        location:
          "Junction B",

        responseTime:
          "--",

        status:
          "Resolved"

      });

    }


    if (incidents.length === 0) {

      incidents.push({

        icon: "✅",

        incident:
          "No Active Emergency",

        location:
          "Monitoring Traffic",

        responseTime:
          "--",

        status:
          "Monitoring"

      });

    }


    // --------------------------------------------------------
    // DYNAMIC AI SUMMARY
    // --------------------------------------------------------

    let aiSummary =
      "Traffic monitoring is active. " +
      "The AI system is continuously analyzing " +
      "vehicle density and emergency activity.";


    if (emergencyDetected) {

      aiSummary =
        `AI detected ${ambulances} emergency vehicle(s). ` +
        "Emergency traffic priority is currently active.";

    } else if (
      trafficDensity === "HIGH"
    ) {

      aiSummary =
        `AI detected high traffic density with ` +
        `${vehicles} vehicles and ${roadOccupancy}% ` +
        "road occupancy. Traffic conditions are being monitored.";

    } else if (
      trafficDensity === "MEDIUM"
    ) {

      aiSummary =
        `AI detected moderate traffic density with ` +
        `${vehicles} vehicles and ${roadOccupancy}% ` +
        "road occupancy.";

    } else {

      aiSummary =
        `AI detected low traffic density with ` +
        `${vehicles} vehicles and ${roadOccupancy}% ` +
        "road occupancy.";

    }


    // --------------------------------------------------------
    // FINAL REPORT RESPONSE
    // --------------------------------------------------------

    res.json({

      status: "success",

      period: period,

      generatedAt:
        now.toISOString(),

      statistics: {

        emergencyVehicles:
          emergencyVehicles,

        signalActivations:
          signalActivations,

        greenCorridors:
          greenCorridors,

        policeAlerts:
          policeAlerts,

        hospitalsNotified:
          hospitalsNotified

      },

      traffic: {

        currentDensity:
          trafficDensity,

        vehicles:
          vehicles,

        ambulances:
          ambulances,

        roadOccupancy:
          roadOccupancy,

        chart:
          trafficChart

      },

      response:
        responsePerformance,

      incidents:
        incidents,

      aiSummary:
        aiSummary

    });

  } catch (error) {

    console.error(
      "Reports API error:",
      error.message
    );

    res.status(500).json({

      status: "error",

      message:
        "Unable to fetch reports and analytics data."

    });

  }

});

// Register API
app.post("/api/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Check required fields
    if (!name || !email || !password) {
      return res.status(400).json({
        message: "Please fill in all fields."
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(409).json({
        message: "An account with this email already exists."
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = new User({
      name,
      email,
      password: hashedPassword
    });

    await user.save();

    res.status(201).json({
      message: "Registration successful!"
    });
  } catch (error) {
    console.error("Registration error:", error.message);

    res.status(500).json({
      message: "Server error during registration."
    });
  }
});

// Login API
app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check required fields
    if (!email || !password) {
      return res.status(400).json({
        message: "Please enter email and password."
      });
    }

    // Find user by email
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password."
      });
    }

    // Compare password with stored hash
    const passwordMatch = await bcrypt.compare(
      password,
      user.password
    );

    if (!passwordMatch) {
      return res.status(401).json({
        message: "Invalid email or password."
      });
    }

    // Create JWT token
    const token = jwt.sign(
      {
        userId: user._id,
        email: user.email
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "1h"
      }
    );

    res.json({
      message: "Login successful!",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    console.error("Login error:", error.message);

    res.status(500).json({
      message: "Server error during login."
    });
  }
});

// ============================================================
// LIVE DETECTION API
// ============================================================

app.get("/api/live-detection", async (req, res) => {

  try {

    const data =
      await getLatestDetection();

    res.json(data);

  } catch (error) {

    console.error(
      "Live detection service connection error:",
      error.message
    );

    res.status(500).json({

      status: "error",

      message:
        "Unable to connect to AI detection service."

    });

  }

});

const PORT = process.env.PORT || 5000;

// Connect MongoDB and start server
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected successfully!");

    app.listen(PORT, () => {
      console.log(
        `IntelliTraffic Backend running on http://localhost:${PORT}`
      );
    });
  })
  .catch((error) => {
    console.error("MongoDB connection failed:", error.message);
  });