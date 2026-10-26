import React, { useState, useEffect } from "react";
import "./App.css";



function App() {


  const [page, setPage] = useState("home");
  const [detectionRunning, setDetectionRunning] = useState(false);
  const [detectionData, setDetectionData] = useState(null);
  const [trafficSignalData, setTrafficSignalData] = useState(null);
  const [hospitalData, setHospitalData] = useState(null);
  const [notifiedHospitals, setNotifiedHospitals] = useState([]);
  const [policeAlertData, setPoliceAlertData] = useState(null);
  const [reportData, setReportData] = useState(null);
  const [notifyingHospitalId, setNotifyingHospitalId] = useState(null);
  const [cancellingHospitalId, setCancellingHospitalId] = useState(null);
  const [theme, setTheme] = useState(
  localStorage.getItem("intellitraffic-theme") || "light"
);

const [aiDetectionEnabled, setAiDetectionEnabled] = useState(true);
const [emergencyAlertsEnabled, setEmergencyAlertsEnabled] = useState(true);
const [trafficNotificationsEnabled, setTrafficNotificationsEnabled] = useState(true);

  const [routeStart, setRouteStart] = useState("Junction A");
  const [routeDestination, setRouteDestination] = useState("Junction D");
  const [routeActivated, setRouteActivated] = useState(false);

  const [registerData, setRegisterData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: ""
  });

  const [loginData, setLoginData] = useState({
    email: "",
    password: ""
  });

  const [message, setMessage] = useState("");
  const [user, setUser] = useState(null);

  useEffect(() => {
  if (page !== "traffic-signals") return;
  if (!detectionRunning) return;
  if (!detectionData) return;

  fetchTrafficSignalData();
fetchHospitalData();



const interval = setInterval(() => {

  fetchTrafficSignalData();
  fetchHospitalData();

}, 3000);

  return () => clearInterval(interval);
}, [page, detectionRunning, detectionData]);

useEffect(() => {
  document.body.className = theme === "dark"
    ? "dark-theme"
    : "light-theme";

  localStorage.setItem(
    "intellitraffic-theme",
    theme
  );
}, [theme]);
// ============================================================
// HOSPITAL NOTIFICATION
// ============================================================

const notifyHospital = async (hospitalId) => {
  if (notifyingHospitalId !== null) return;

  setNotifyingHospitalId(hospitalId);

  try {
    const response = await fetch(
      `http://localhost:5000/api/hospitals/${hospitalId}/notify`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        }
      }
    );

    const data = await response.json();

    console.log("NOTIFY API RESPONSE:", data);

    if (response.ok) {

      setNotifiedHospitals((prev) => {
        if (prev.includes(hospitalId)) {
          return prev;
        }

        return [...prev, hospitalId];
      });

      alert(data.message);

      fetchHospitalData();

    } else {
      alert(
        data.message ||
        "Unable to notify hospital."
      );
    }

  } catch (error) {
    console.error(
      "Hospital notification error:",
      error
    );

    alert(
      "Unable to connect to hospital notification API."
    );

  } finally {
    setNotifyingHospitalId(null);
  }
};


const cancelHospitalNotification = async (hospitalId) => {
  if (cancellingHospitalId !== null) return;

  setCancellingHospitalId(hospitalId);

  try {
    const response = await fetch(
      `http://localhost:5000/api/hospitals/${hospitalId}/cancel-notification`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        }
      }
    );

    const data = await response.json();

    console.log("CANCEL NOTIFICATION RESPONSE:", data);

    if (response.ok) {

      setNotifiedHospitals((prev) =>
        prev.filter((id) => id !== hospitalId)
      );

      alert(data.message);

      fetchHospitalData();

    } else {
      alert(
        data.message ||
        "Unable to cancel hospital notification."
      );
    }

  } catch (error) {
    console.error(
      "Cancel hospital notification error:",
      error
    );

    alert(
      "Unable to connect to hospital notification API."
    );

  } finally {
    setCancellingHospitalId(null);
  }
};


useEffect(() => {
  if (!detectionRunning) return;

  fetchDetectionData();

  const interval = setInterval(() => {
    fetchDetectionData();
  }, 5000);

  return () => clearInterval(interval);
}, [detectionRunning]);

const fetchHospitalData = async () => {
  try {
    const response = await fetch(
      "http://localhost:5000/api/hospitals"
    );

    const data = await response.json();

    if (response.ok) {
      setHospitalData(data);
    }

  } catch (error) {
    console.error("Hospital API error:", error);
  }
};

// ============================================================
// FETCH REPORTS & ANALYTICS DATA
// ============================================================

const fetchReportsData = async () => {

  try {

    const response = await fetch(
      "http://localhost:5000/api/reports"
    );

    const data = await response.json();

    if (response.ok) {

      setReportData(data);

    }

  } catch (error) {

    console.error(
      "Reports API error:",
      error
    );

  }

};

useEffect(() => {

  fetchReportsData();

  const interval = setInterval(
    fetchReportsData,
    5000
  );

  return () => {

    clearInterval(interval);

  };

}, [detectionRunning]);

useEffect(() => {

  const fetchPoliceAlerts = async () => {

    // Do not check police alerts before detection starts
    if (!detectionRunning) {

      setPoliceAlertData({
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

      return;
    }


    try {

      const response = await fetch(
        "http://localhost:5000/api/police-alerts"
      );

      const data = await response.json();

      if (data.status === "success") {
        setPoliceAlertData(data);
      }

    } catch (error) {

      console.error(
        "Police alerts API error:",
        error
      );

    }

  };


  // Check immediately
  fetchPoliceAlerts();


  // Keep checking while detection is running
  const interval = setInterval(
    fetchPoliceAlerts,
    5000
  );


  return () => {
    clearInterval(interval);
  };

}, [detectionRunning]);

const sendPoliceAlert = async () => {

  try {

    const response = await fetch(
      "http://localhost:5000/api/police-alerts/send",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        }
      }
    );

    const data = await response.json();

    if (response.ok) {

      alert(data.message);

    } else {

      alert(
        data.message ||
        "Unable to send police alert."
      );

    }

  } catch (error) {

    console.error(
      "Send police alert error:",
      error
    );

    alert(
      "Unable to connect to police alert service."
    );

  }

};

const resolvePoliceAlert = async () => {

  try {

    const response = await fetch(
      "http://localhost:5000/api/police-alerts/resolve",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        }
      }
    );

    const data = await response.json();

    if (response.ok) {

      alert(data.message);

    } else {

      alert(
        data.message ||
        "Unable to resolve police alert."
      );

    }

  } catch (error) {

    console.error(
      "Resolve police alert error:",
      error
    );

    alert(
      "Unable to connect to police alert service."
    );

  }

};

  // ==================== REGISTER ====================

  const handleRegisterChange = (e) => {
    setRegisterData({
      ...registerData,
      [e.target.name]: e.target.value
    });
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setMessage("");

    if (registerData.password !== registerData.confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }

    try {
      const response = await fetch(
        "http://localhost:5000/api/register",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            name: registerData.name,
            email: registerData.email,
            password: registerData.password
          })
        }
      );

      const data = await response.json();

      if (response.ok) {
        setMessage(data.message);

        setRegisterData({
          name: "",
          email: "",
          password: "",
          confirmPassword: ""
        });
      } else {
        setMessage(data.message);
      }
    } catch (error) {
      setMessage(
        "Unable to connect to the server. Please try again."
      );
    }
  };

  // ==================== LOGIN ====================

  const handleLoginChange = (e) => {
    setLoginData({
      ...loginData,
      [e.target.name]: e.target.value
    });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setMessage("");

    try {
      const response = await fetch(
        "http://localhost:5000/api/login",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(loginData)
        }
      );

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem("token", data.token);

        setUser(data.user);
        setPage("dashboard");

        setLoginData({
          email: "",
          password: ""
        });
      } else {
        setMessage(data.message);
      }
    } catch (error) {
      setMessage(
        "Unable to connect to the server. Please try again."
      );
    }
  };

  
  const fetchDetectionData = async () => {
  try {
    const response = await fetch(
      "http://localhost:5000/api/detection"
    );

    const data = await response.json();

    console.log("Detection Data:", data);

    if (response.ok) {
      setDetectionData(data.detection);
    }
  } catch (error) {
    console.error("Detection API error:", error);
  }
};


const fetchTrafficSignalData = async () => {
  try {
    const response = await fetch(
      "http://localhost:5000/api/traffic-signal"
    );

    const data = await response.json();

    if (response.ok) {
      setTrafficSignalData(data.trafficSignal);
    }
  } catch (error) {
    console.error("Traffic Signal API error:", error);
  }
};


const handleStartDetection = async () => {

  // Clear previous detection result
  setDetectionData(null);

  try {

    const response = await fetch(
      "http://localhost:5000/api/detection"
    );

    const data = await response.json();

    console.log("Detection Response:", data);

    if (response.ok) {

      setDetectionData(data.detection);

      setDetectionRunning(true);
    }

  } catch (error) {

    console.error(
      "Detection connection failed:",
      error
    );

  }
};
  // ==================== LOGOUT ====================

  const handleLogout = () => {
    localStorage.removeItem("token");
    setUser(null);
    setMessage("");
    setDetectionRunning(false);
    setPage("home");
  };

  // ============================================================
  // LIVE DETECTION PAGE
  // ============================================================

  if (page === "live-detection") {
    return (
      <div className="dashboard">

       
        {/* HEADER */}
<header className="dashboard-header">

  {/* LEFT - BRAND */}
  <div className="header-left">

    <div className="brand-header">

      <div className="brand-title">
        🚦 IntelliTraffic
      </div>

      <div className="brand-tagline">
        Smarter Traffic. Faster Response. Safer Roads.
      </div>

    </div>

  </div>

  {/* CENTER - SEARCH */}
  <div className="header-search">

    <span>🔍</span>

    <input
      type="text"
      placeholder="Search..."
    />

    <span className="search-shortcut">
      Ctrl K
    </span>

  </div>

  {/* RIGHT - OPERATOR */}
  <div className="header-right">

    <span className="notification">
      🔔
    </span>

    <div className="operator">

      <div className="operator-avatar">
        👤
      </div>

      <div>
        <strong>
          {user?.name || "Operator"}
        </strong>

        <small>
          Control Room
        </small>
      </div>

    </div>

    <button
      className="logout-small"
      onClick={handleLogout}
    >
      Logout
    </button>

  </div>

</header>

        <div className="dashboard-body">

          {/* SIDEBAR */}
          <aside className="sidebar">

            

            <nav>

              <button
                className="sidebar-item"
                onClick={() => setPage("dashboard")}
              >
                🏠
                <span>Dashboard</span>
              </button>

              <button
                className="sidebar-item active"
                onClick={() => setPage("live-detection")}
              >
                📹
                <span>Live Detection</span>
              </button>

              <button
  className="sidebar-item"
  onClick={() => setPage("traffic-signals")}
>
  🚦
  <span>Traffic Signals</span>
</button>

<button
  className="sidebar-item"
  onClick={() => setPage("route-optimization")}
>
  🛣️
  <span>Route Optimization</span>
</button>

              <button
  className="sidebar-item"
  onClick={() => setPage("hospitals")}
>
  🏥
  <span>Hospitals</span>
</button>

              <button
  className="sidebar-item"
  onClick={() => setPage("police-alerts")}
>
  🚨
  <span>Police Alerts</span>
</button>

              <button
  className="sidebar-item"
  onClick={() => setPage("reports")}
>
  📊
  <span>Reports & Analytics</span>
</button>

              <button
  className="sidebar-item"
  onClick={() => setPage("settings")}
>
  ⚙️
  <span>Settings</span>
</button>

            </nav>

            

          </aside>

          {/* MAIN CONTENT */}
          <main className="dashboard-content">

            <div className="welcome-section">

              <h2>
                Live Traffic Detection
              </h2>

              <p>
                Monitor traffic conditions and detect emergency
                vehicles using AI-powered computer vision.
              </p>

            </div>

            {/* SYSTEM STATUS */}
            <div className="detection-status-card">

              <div>
                <h3>
                  AI Detection System
                </h3>

                <p>
                  {detectionRunning
                    ? "Detection system is currently running."
                    : "Detection system is currently stopped."
                  }
                </p>
              </div>

              <span
                className={
                  detectionRunning
                    ? "detection-online"
                    : "detection-offline"
                }
              >
                ●{" "}
                {detectionRunning
                  ? "SYSTEM ONLINE"
                  : "SYSTEM OFFLINE"
                }
              </span>

            </div>

            {/* CAMERA + RESULTS */}
            <div className="detection-grid">

              {/* CAMERA */}
              <div className="panel detection-video-panel">

                <div className="panel-header">

                  <h3>
                    📹 Live Camera Feed
                  </h3>

                  <span className="live-status">
                    {detectionRunning
                      ? "● LIVE"
                      : "● OFFLINE"
                    }
                  </span>

                </div>

                <div className="camera-placeholder">

  {!detectionRunning ? (

    <>
      <div className="camera-icon">
        📹
      </div>

      <h3>
        Camera Feed
      </h3>

      <p>
        Start detection to begin monitoring.
      </p>
    </>

  ) : (

    <img
      src="http://127.0.0.1:8000/video-feed"
      alt="Live Traffic Feed"
      className="live-camera-feed"
    />

  )}

</div>

                <button
  className={
    detectionRunning
      ? "stop-detection-button"
      : "start-detection-button"
  }
  onClick={handleStartDetection}
>
                  {detectionRunning
                    ? "■ Stop Detection"
                    : "▶ Start Detection"
                  }
                </button>

              </div>

              {/* AI RESULTS */}
              <div className="panel">

                <div className="panel-header">

                  <h3>
                    🤖 AI Detection Results
                  </h3>

                </div>

                <div className="detection-result">

  <div className="result-icon">
    🚗
  </div>

  <div>
    <strong>
      Vehicles
    </strong>

    <p>
      {detectionData
        ? `${detectionData.vehicles} vehicles detected`
        : "No detection data available"
      }
    </p>
  </div>

</div>

                <div className="detection-result">

                  <div className="result-icon emergency-result">
                    🚑
                  </div>

                  <div>
                    <strong>
                      Emergency Vehicles
                    </strong>

                   <p>
  {detectionData?.emergencyVehicleDetected
    ? "1 ambulance detected"
    : "No emergency vehicle detected"
  }
</p>
                  </div>

                </div>

                <div className="detection-result">

                  <div className="result-icon">
                    🏍️
                  </div>

                  <div>
                    <strong>
                      Two-Wheelers
                    </strong>

                   <p>
  {detectionData
    ? `${detectionData.motorcycles} motorcycles detected`
    : "No detection data available"
  }
</p>

                  </div>

                </div>

                <div className="detection-result">

                  <div className="result-icon">
                    🚚
                  </div>

                  <div>
                    <strong>
                      Heavy Vehicles
                    </strong>

                    <p>
  {detectionData
    ? `${detectionData.trucks} trucks detected`
    : "No detection data available"
  }
</p>

                  </div>

                </div>

              </div>

            </div>

            {/* TRAFFIC ANALYSIS */}
            <div className="detection-analysis-grid">

              {/* DENSITY */}
              <div className="panel">

                <div className="panel-header">

                  <h3>
                    🚦 Traffic Density
                  </h3>

                  <span className="active-badge">
                    AI Analysis
                  </span>

                </div>

                <div className="density-display">

                  <strong>
  {detectionData
    ? detectionData.trafficDensity
    : "N/A"
  }
</strong>

                  <p>
                    Current traffic density
                  </p>

                  <div className="density-bar">

                   <div
  className="density-progress"
  style={{
    width: `${detectionData?.roadOccupancy ?? 0}%`
  }}
></div>

                  </div>

                  <small>
  {detectionData
    ? `${detectionData.roadOccupancy}% road occupancy`
    : "Road occupancy unavailable"
  }
</small>

                </div>

              </div>

              {/* EMERGENCY */}
              <div className="panel">

                <div className="panel-header">

                  <h3>
                    🚑 Emergency Detection
                  </h3>

                </div>

                <div className="emergency-detection">

  <div className="large-emergency-icon">
    🚑
  </div>

  <div>

    <strong>
      {detectionData?.emergencyVehicleDetected
        ? "Ambulance Detected"
        : "No Emergency Vehicle Detected"
      }
    </strong>

    <p>
      {detectionData?.emergencyVehicleDetected
        ? "Emergency vehicle detected by AI."
        : "No emergency vehicle currently detected."
      }
    </p>

    {detectionData?.emergencyVehicleDetected && (
      <span>
        High Priority
      </span>
    )}

  </div>

</div>

              </div>

            </div>

          </main>

        </div>

      </div>
    );
  }

  // ============================================================
  // DASHBOARD PAGE
  // ============================================================

  const getGreeting = () => {
  const hour = new Date().getHours();

  if (hour >= 5 && hour < 12) {
    return "Good Morning";
  } else if (hour >= 12 && hour < 17) {
    return "Good Afternoon";
  } else if (hour >= 17 && hour < 21) {
    return "Good Evening";
  } else {
    return "Good Night";
  }
};

  if (page === "dashboard") {
    return (
      <div className="dashboard">

        <header className="dashboard-header">

  {/* LEFT - BRAND */}
  <div className="header-left">

    <div className="brand-header">

      <div className="brand-main">
        <span className="brand-logo">🚦</span>

        <span className="brand-title">
          IntelliTraffic
        </span>
      </div>

      <span className="brand-tagline">
        Smarter Signals. Faster Response. Safer Roads.
      </span>

    </div>

  </div>


  {/* CENTER - SEARCH */}
  <div className="header-search">

    <span>🔍</span>

    <input
      type="text"
      placeholder="Search IntelliTraffic..."
    />

    <span className="search-shortcut">
      Ctrl K
    </span>

  </div>


  {/* RIGHT - OPERATOR */}
  <div className="header-right">

    <span className="notification">
      🔔
    </span>

    <div className="operator">

      <div className="operator-avatar">
        👤
      </div>

      <div>
        <strong>
          {user?.name || "Operator"}
        </strong>

        <small>
          Control Room
        </small>
      </div>

    </div>

    <button
      className="logout-small"
      onClick={handleLogout}
    >
      Logout
    </button>

  </div>

</header>

        <div className="dashboard-body">

          {/* SIDEBAR */}
          <aside className="sidebar">

            

            <nav>

              <button
                className="sidebar-item active"
                onClick={() => setPage("dashboard")}
              >
                🏠
                <span>Dashboard</span>
              </button>

              <button
                className="sidebar-item"
                onClick={() => setPage("live-detection")}
              >
                📹
                <span>Live Detection</span>
              </button>

              <button
  className="sidebar-item"
  onClick={() => setPage("traffic-signals")}
>
  🚦
  <span>Traffic Signals</span>
</button>

              <button
  className="sidebar-item"
  onClick={() => setPage("route-optimization")}
>
  🛣️
  <span>Route Optimization</span>
</button>

              <button
  className="sidebar-item"
  onClick={() => setPage("hospitals")}
>
  🏥
  <span>Hospitals</span>
</button>
              <button className="sidebar-item">
                🚨
                <span>Police Alerts</span>
              </button>

              <button
  className="sidebar-item"
  onClick={() => setPage("reports")}
>
  📊
  <span>Reports & Analytics</span>
</button>

              <button
  className="sidebar-item"
  onClick={() => setPage("settings")}
>
  ⚙️
  <span>Settings</span>
</button>

            </nav>

            

          </aside>

          {/* MAIN CONTENT */}
          <main className="dashboard-content">

            <div className="welcome-section">

  <h2>
    {getGreeting()}, {user?.name || "Operator"}!
  </h2>

  <p>
    Here's what's happening in the city today.
  </p>

</div>

            {/* STATISTICS */}
            <div className="stats-grid">

              <div className="traffic-card">

                <div className="card-icon">
                  🚑
                </div>

                <h4>
                  Emergency Vehicles
                </h4>

                <strong>
  {detectionData?.ambulances ?? 0}
</strong>

                <p>
                  Detected Today
                </p>

                <span className="increase">
                  ↑ 20% vs yesterday
                </span>

              </div>

              <div className="traffic-card">

                <div className="card-icon">
                  🚦
                </div>

                <h4>
                  Active Traffic Signals
                </h4>

                <strong>
  {trafficSignalData?.greenTime ?? "--"}s
</strong>

<p>
  AI Green Signal Time
</p>

                <span className="increase">
                  ↑ 8% vs yesterday
                </span>

              </div>

              <div className="traffic-card">

  <div className="card-icon">
    🟢
  </div>

  <h4>
    Green Corridors
  </h4>

  <strong>
    {trafficSignalData?.priority === "HIGH" ? "1" : "0"}
  </strong>

  <p>
    {trafficSignalData?.priority === "HIGH"
      ? "Emergency Corridor Active"
      : "No Emergency Corridor"}
  </p>

  <span className="increase">
    {trafficSignalData?.priority === "HIGH"
      ? "AI corridor activated"
      : "AI monitoring active"}
  </span>

</div>

              <div className="traffic-card">

                <div className="card-icon">
                  🚗
                </div>

                <h4>
                  Traffic Density
                </h4>

                <strong>
  {detectionData?.trafficDensity ?? "LOW"}
</strong>

<p>
  Based on AI vehicle detection
</p>

                <span className="increase">
                  ↑ 15% vs yesterday
                </span>

              </div>

            </div>

            {/* MIDDLE SECTION */}
            <div className="dashboard-grid">

              {/* TRAFFIC MAP */}
<div className="panel traffic-map">

  <div className="panel-header">

    <h3>
      Live Traffic Overview
    </h3>

    <span className="live-status">
      ● Live
    </span>

  </div>

  <div className="map-placeholder">

    <div className="road road-1"></div>
    <div className="road road-2"></div>
    <div className="road road-3"></div>
    <div className="road road-4"></div>

    {/* AI DETECTION SUMMARY */}

    {detectionData?.ambulances > 0 && (
      <span className="map-marker ambulance">
        🚑
      </span>
    )}

    {detectionData?.cars > 0 && (
      <span className="map-marker car1">
        🚗
      </span>
    )}

    {detectionData?.buses > 0 && (
      <span className="map-marker car2">
        🚌
      </span>
    )}

    {detectionData?.emergencyVehicleDetected && (
      <span className="map-marker signal1">
        🚨
      </span>
    )}

    <div className="traffic-ai-counts">

      <div>
        🚑 Ambulances:
        <strong>
          {detectionData?.ambulances ?? 0}
        </strong>
      </div>

      <div>
        🚗 Cars:
        <strong>
          {detectionData?.cars ?? 0}
        </strong>
      </div>

      <div>
        🚌 Buses:
        <strong>
          {detectionData?.buses ?? 0}
        </strong>
      </div>

      <div>
        🏍️ Motorcycles:
        <strong>
          {detectionData?.motorcycles ?? 0}
        </strong>
      </div>

    </div>

  </div>

</div>
              {/* AI DECISION */}
              <div className="panel">

                <div className="panel-header">

                  <h3>
                    AI Decision
                  </h3>

                  <span className="active-badge">
  {detectionData?.emergencyVehicleDetected
    ? "Emergency Priority"
    : "Monitoring"}
</span>

                </div>

                <div className="ai-alert">

                  <div className="ai-icon">
                    🚑
                  </div>

                  <div>

                    <strong>
  {detectionData?.emergencyVehicleDetected
    ? "Ambulance Detected"
    : "No Emergency Vehicle Detected"}
</strong>

                    <p>
  {detectionData?.emergencyVehicleDetected
    ? "Emergency priority route detected"
    : "Monitoring traffic conditions"}
</p>

                  </div>

                </div>

                <div className="ai-info">

                  <small>
                    Action
                  </small>

                  <p>
  {detectionData?.emergencyVehicleDetected
    ? "Emergency priority signal recommended"
    : `Traffic density: ${detectionData?.trafficDensity ?? "LOW"}`}
</p>

                </div>

                <div className="time-saved">

  <small>
    AI Signal Decision
  </small>

  <strong>
    {trafficSignalData?.greenTime
      ? `${trafficSignalData.greenTime} sec`
      : "--"}
  </strong>

  <p>
    {trafficSignalData?.priority
      ? `Priority: ${trafficSignalData.priority}`
      : "Waiting for AI decision"}
  </p>

</div>

                <button className="corridor-button">
  {detectionData?.emergencyVehicleDetected
    ? "✓ Emergency Corridor Activated"
    : "✓ Traffic Monitoring Active"}
</button>

              </div>

              {/* ALERTS */}
<div className="panel">

  <div className="panel-header">

    <h3>
      Recent Alerts
    </h3>

    <span className="view-all">
      View All
    </span>

  </div>

  {/* AMBULANCE ALERT */}
  {detectionData?.emergencyVehicleDetected && (
    <div className="alert-item">

      🚑

      <div>
        <strong>
          Ambulance Detected
        </strong>

        <p>
          Emergency vehicle detected by AI
        </p>
      </div>

      <small>
        Just now
      </small>

    </div>
  )}

  {/* HIGH TRAFFIC ALERT */}
  {detectionData?.trafficDensity === "HIGH" && (
    <div className="alert-item">

      🚗

      <div>
        <strong>
          High Traffic Density
        </strong>

        <p>
          Heavy traffic detected by AI
        </p>
      </div>

      <small>
        Just now
      </small>

    </div>
  )}

  {/* NORMAL MONITORING */}
  {!detectionData?.emergencyVehicleDetected &&
   detectionData?.trafficDensity !== "HIGH" && (
    <div className="alert-item">

      ✅

      <div>
        <strong>
          Traffic Monitoring Active
        </strong>

        <p>
          No emergency vehicle detected
        </p>
      </div>

      <small>
        Just now
      </small>

    </div>
  )}

</div>

</div>

            {/* BOTTOM SECTION */}
            <div className="bottom-grid">

              <div className="panel">

                <div className="panel-header">

                  <h3>
                    Traffic Density Overview
                  </h3>

                </div>

                <div className="chart">

  <div
    className="dynamic-chart-line"
    style={{
      "--traffic-level": `${detectionData?.roadOccupancy ?? 0}%`
    }}
  ></div>

  <div className="chart-current-value">
    <strong>
      {detectionData?.trafficDensity ?? "LOW"}
    </strong>

    <span>
      {detectionData?.roadOccupancy ?? 0}% road occupancy
    </span>
  </div>

  <div className="chart-labels">

    <span>Traffic Level</span>

    <span>AI Live Data</span>

    <span>
      {detectionData?.roadOccupancy ?? 0}%
    </span>

  </div>

</div>

              </div>

              <div className="panel response-panel">

  <div className="panel-header">

    <h3>
      AI Traffic Analysis
    </h3>

    <span className="active-badge">
      LIVE AI
    </span>

  </div>

  <div className="response-content">

    <div>

      <strong className="response-time">
        {detectionData?.roadOccupancy ?? 0}%
      </strong>

      <span>
        occupancy
      </span>

      <p>
        Current Road Occupancy
      </p>

      <span className="improvement">
        {detectionData?.trafficDensity
          ? `Traffic Density: ${detectionData.trafficDensity}`
          : "Waiting for AI data"}
      </span>

    </div>

    <div
  className="donut"
  style={{
    "--occupancy": `${detectionData?.roadOccupancy ?? 0}%`
  }}
>
  <div className="donut-inner">
    {detectionData?.roadOccupancy ?? 0}%
  </div>
</div>

  </div>

</div>

            </div>

          </main>

        </div>

      </div>
    );
  }

// ============================================================
// TRAFFIC SIGNAL DATA
// ============================================================

const signalData = {
  "Junction A": {
    status: "RED",
    timer: 32,
    traffic: "MEDIUM",
    mode: "NORMAL"
  },

  "Junction B": {
    status: trafficSignalData?.emergencyVehicleDetected
      ? "GREEN"
      : "RED",
    timer: trafficSignalData?.greenTime || 30,
    traffic: trafficSignalData?.trafficDensity || "N/A",
    mode: trafficSignalData?.emergencyVehicleDetected
      ? "EMERGENCY"
      : "AI CONTROL"
  },

  "Junction C": {
    status: trafficSignalData?.emergencyVehicleDetected
      ? "GREEN"
      : "YELLOW",
    timer: trafficSignalData?.emergencyVehicleDetected
      ? trafficSignalData?.greenTime || 30
      : 8,
    traffic: trafficSignalData?.trafficDensity || "N/A",
    mode: trafficSignalData?.emergencyVehicleDetected
      ? "GREEN CORRIDOR"
      : "AI CONTROL"
  },

  "Junction D": {
    status: "RED",
    timer: 25,
    traffic: "LOW",
    mode: "NORMAL"
  }
};

// ============================================================
// SIGNAL SUMMARY CALCULATIONS
// ============================================================

const signalList = Object.values(signalData);

const activeSignals = signalList.length;

const greenSignals = signalList.filter(
  signal => signal.status === "GREEN"
).length;

const redSignals = signalList.filter(
  signal => signal.status === "RED"
).length;

const emergencyPriority =
  trafficSignalData?.emergencyPriority ?? 0;
  
  // ============================================================
// TRAFFIC SIGNALS PAGE
// ============================================================

const junctionA = trafficSignalData?.junctions?.A;
const junctionB = trafficSignalData?.junctions?.B;
const junctionC = trafficSignalData?.junctions?.C;
const junctionD = trafficSignalData?.junctions?.D;

if (page === "traffic-signals") {
  
  return (
    <div className="dashboard">

      {/* HEADER */}
      {/* HEADER */}
<header className="dashboard-header">

  {/* LEFT - BRAND */}
  <div className="header-left">

    <div className="brand-header">

      <div className="brand-title">
        🚦 IntelliTraffic
      </div>

      <div className="brand-tagline">
        Smarter Traffic. Faster Response. Safer Roads.
      </div>

    </div>

  </div>

  {/* CENTER - SEARCH */}
  <div className="header-search">

    <span>🔍</span>

    <input
      type="text"
      placeholder="Search..."
    />

    <span className="search-shortcut">
      Ctrl K
    </span>

  </div>

  {/* RIGHT - OPERATOR */}
  <div className="header-right">

    <span className="notification">
      🔔
    </span>

    <div className="operator">

      <div className="operator-avatar">
        👤
      </div>

      <div>
        <strong>
          {user?.name || "Operator"}
        </strong>

        <small>
          Control Room
        </small>
      </div>

    </div>

    <button
      className="logout-small"
      onClick={handleLogout}
    >
      Logout
    </button>

  </div>

</header>


      <div className="dashboard-body">

        {/* SIDEBAR */}
        <aside className="sidebar">

          

          <nav>

            <button
              className="sidebar-item"
              onClick={() => setPage("dashboard")}
            >
              🏠
              <span>Dashboard</span>
            </button>

            <button
              className="sidebar-item"
              onClick={() => setPage("live-detection")}
            >
              📹
              <span>Live Detection</span>
            </button>

            <button
              className="sidebar-item active"
              onClick={() => setPage("traffic-signals")}
            >
              🚦
              <span>Traffic Signals</span>
            </button>

            <button
  className="sidebar-item"
  onClick={() => setPage("route-optimization")}
>
  🛣️
  <span>Route Optimization</span>
</button>

            <button
  className="sidebar-item"
  onClick={() => setPage("hospitals")}
>
  🏥
  <span>Hospitals</span>
</button>

            <button className="sidebar-item">
              🚨
              <span>Police Alerts</span>
            </button>

            <button className="sidebar-item">
              📊
              <span>Reports & Analytics</span>
            </button>

            <button className="sidebar-item">
              ⚙️
              <span>Settings</span>
            </button>

          </nav>

         

        </aside>


        {/* MAIN CONTENT */}
        <main className="dashboard-content">

          <div className="welcome-section">

            <h2>
              Traffic Signal Control
            </h2>

            <p>
              Monitor and manage traffic signals using
              AI-powered traffic analysis.
            </p>

          </div>


          {/* AI STATUS */}
          <div className="detection-status-card">

            <div>

              <h3>
                🤖 AI Traffic Control System
              </h3>

              <p>
                AI is analyzing traffic density and emergency
                vehicle priority across active junctions.
              </p>

            </div>

            <span className="detection-online">
              ● SYSTEM ACTIVE
            </span>

          </div>


          {/* SIGNAL SUMMARY */}
          <div className="stats-grid">

            <div className="traffic-card">

              <div className="card-icon">
                🚦
              </div>

              <h4>
                Active Signals
              </h4>

            <strong>
  {trafficSignalData?.activeSignals ?? "--"}
</strong>

<p>
  Signals currently operating
</p>

            </div>


            <div className="traffic-card">

              <div className="card-icon">
                🟢
              </div>

              <h4>
                Green Signals
              </h4>

            <strong>
  {trafficSignalData?.greenSignals ?? "--"}
</strong>

<p>
  Currently green
</p>
            </div>


            <div className="traffic-card">

              <div className="card-icon">
                🔴
              </div>

              <h4>
                Red Signals
              </h4>

             <strong>
  {trafficSignalData?.redSignals ?? "--"}
</strong>

<p>
  Currently red
</p>

            </div>


            <div className="traffic-card">

              <div className="card-icon">
                🚑
              </div>

              <h4>
                Emergency Priority
              </h4>

              <strong>
  {trafficSignalData?.emergencyPriority ?? "--"}
</strong>

<p>
  {trafficSignalData?.emergencyPriority > 0
    ? "Active emergency corridor"
    : "No active emergency corridor"}
</p>

            </div>

          </div>


          {/* JUNCTIONS */}
          <div className="signal-junction-grid">


          {/* JUNCTION A */}
<div className="panel signal-junction">

  <div className="panel-header">

    <h3>
      🚦 Junction A
    </h3>

    <span className="active-badge">
      {junctionA?.mode || "AI CONTROL"}
    </span>

  </div>


  {/* SIGNAL DISPLAY */}

  <div className="signal-display">

    <div
      className={
        junctionA?.status === "RED"
          ? "signal-light red"
          : "signal-light red-off"
      }
    >
      🔴
    </div>


    <div
      className={
        junctionA?.status === "YELLOW"
          ? "signal-light yellow"
          : "signal-light yellow-off"
      }
    >
      🟡
    </div>


    <div
      className={
        junctionA?.status === "GREEN"
          ? "signal-light green"
          : "signal-light green-off"
      }
    >
      🟢
    </div>

  </div>


  {/* SIGNAL INFORMATION */}

  <div className="signal-info">

    <p>
      <strong>Status:</strong>{" "}
      {junctionA?.status || "--"}
    </p>

    <p>
      <strong>Timer:</strong>{" "}
      {junctionA?.timer ?? "--"} seconds
    </p>

    <p>
      <strong>Traffic:</strong>{" "}
      {junctionA?.traffic || "N/A"}
    </p>

  </div>


  <button className="signal-control-button">

    {junctionA?.status === "GREEN"
      ? "Green Signal Active"
      : junctionA?.status === "YELLOW"
      ? "Yellow Signal Active"
      : "Signal Waiting"}

  </button>

</div>


            {/* JUNCTION B */}
<div className="panel signal-junction emergency-junction">

  <div className="panel-header">

    <h3>
      🚦 Junction B
    </h3>

    <span className="active-badge emergency-badge">
      {junctionB?.mode || "AI CONTROL"}
    </span>

  </div>


  {/* SIGNAL DISPLAY */}

  <div className="signal-display">

    <div
      className={
        junctionB?.status === "RED"
          ? "signal-light red"
          : "signal-light red-off"
      }
    >
      🔴
    </div>


    <div
      className={
        junctionB?.status === "YELLOW"
          ? "signal-light yellow"
          : "signal-light yellow-off"
      }
    >
      🟡
    </div>


    <div
      className={
        junctionB?.status === "GREEN"
          ? "signal-light green"
          : "signal-light green-off"
      }
    >
      🟢
    </div>

  </div>


  {/* SIGNAL INFORMATION */}

  <div className="signal-info">

    <p>
      <strong>Status:</strong>{" "}
      {junctionB?.status || "--"}
    </p>

    <p>
      <strong>Timer:</strong>{" "}
      {junctionB?.timer ?? "--"} seconds
    </p>

    <p>
      <strong>Traffic:</strong>{" "}
      {junctionB?.traffic || "N/A"}
    </p>

  </div>


  {/* EMERGENCY MESSAGE */}

  {junctionB?.emergency && (
    <div className="emergency-signal-message">
      🚑 Ambulance priority active
    </div>
  )}


  {/* BUTTON */}

  <button className="signal-control-button emergency-control">

    {junctionB?.emergency
      ? "Green Corridor Active"
      : "AI Signal Control"}

  </button>

</div>


           {/* JUNCTION C */}
<div className="panel signal-junction">

  <div className="panel-header">

    <h3>
      🚦 Junction C
    </h3>

    <span className="active-badge">
      {junctionC?.mode || "AI CONTROL"}
    </span>

  </div>


  {/* SIGNAL DISPLAY */}

  <div className="signal-display">

    <div
      className={
        junctionC?.status === "RED"
          ? "signal-light red"
          : "signal-light red-off"
      }
    >
      🔴
    </div>

    <div
      className={
        junctionC?.status === "YELLOW"
          ? "signal-light yellow"
          : "signal-light yellow-off"
      }
    >
      🟡
    </div>

    <div
      className={
        junctionC?.status === "GREEN"
          ? "signal-light green"
          : "signal-light green-off"
      }
    >
      🟢
    </div>

  </div>


  {/* SIGNAL INFORMATION */}

  <div className="signal-info">

    <p>
      <strong>Status:</strong>{" "}
      {junctionC?.status || "--"}
    </p>

    <p>
      <strong>Timer:</strong>{" "}
      {junctionC?.timer ?? "--"} seconds
    </p>

    <p>
      <strong>Traffic:</strong>{" "}
      {junctionC?.traffic || "N/A"}
    </p>

  </div>


  {/* EMERGENCY MESSAGE */}

  {junctionC?.emergency && (
    <div className="emergency-signal-message">
      🚑 Emergency corridor active
    </div>
  )}


  {/* BUTTON */}

  <button className="signal-control-button">

    {junctionC?.emergency
      ? "Emergency Corridor Active"
      : "AI Optimize"}

  </button>

</div>


           {/* JUNCTION D */}
<div className="panel signal-junction">

  <div className="panel-header">

    <h3>
      🚦 Junction D
    </h3>

    <span className="active-badge">
      {junctionD?.mode || "AI CONTROL"}
    </span>

  </div>


  {/* SIGNAL DISPLAY */}

  <div className="signal-display">

    <div
      className={
        junctionD?.status === "RED"
          ? "signal-light red"
          : "signal-light red-off"
      }
    >
      🔴
    </div>

    <div
      className={
        junctionD?.status === "YELLOW"
          ? "signal-light yellow"
          : "signal-light yellow-off"
      }
    >
      🟡
    </div>

    <div
      className={
        junctionD?.status === "GREEN"
          ? "signal-light green"
          : "signal-light green-off"
      }
    >
      🟢
    </div>

  </div>


  {/* SIGNAL INFORMATION */}

  <div className="signal-info">

    <p>
      <strong>Status:</strong>{" "}
      {junctionD?.status || "--"}
    </p>

    <p>
      <strong>Timer:</strong>{" "}
      {junctionD?.timer ?? "--"} seconds
    </p>

    <p>
      <strong>Traffic:</strong>{" "}
      {junctionD?.traffic || "N/A"}
    </p>

  </div>


  {/* BUTTON */}

  <button className="signal-control-button">

    {junctionD?.emergency
      ? "Emergency Corridor Active"
      : "AI Signal Control"}

  </button>

</div>

</div> 

          {/* AI DECISION PANEL */}
          <div className="panel ai-signal-panel">

            <div className="panel-header">

              <h3>
                🤖 AI Signal Decision
              </h3>

              <span className="live-status">
                ● LIVE ANALYSIS
              </span>

            </div>

            <div className="ai-signal-content">

  {/* AI ICON */}

  <div className="ai-signal-icon">

    {trafficSignalData?.emergencyVehicleDetected
      ? "🚑"
      : "🤖"}

  </div>


  <div>

    {/* AI DECISION */}

    <strong>

      {trafficSignalData?.emergencyVehicleDetected
        ? "Emergency Vehicle Priority Detected"
        : "Normal Traffic Optimization"}

    </strong>


    {/* AI EXPLANATION */}

    <p>

      {trafficSignalData?.emergencyVehicleDetected

        ? `Emergency vehicle detected. AI has activated priority signals at Junction B and Junction C to create a clear emergency corridor.`

        : `No emergency vehicle detected. AI is optimizing traffic signals based on ${trafficSignalData?.trafficDensity || "current"} traffic density.`}

    </p>


    {/* CURRENT TRAFFIC */}

    <small>

      {trafficSignalData?.emergencyVehicleDetected

        ? `Traffic density: ${trafficSignalData?.trafficDensity || "N/A"} | Priority: ${trafficSignalData?.priority || "N/A"}`

        : `Traffic density: ${trafficSignalData?.trafficDensity || "Analyzing..."} | Priority: ${trafficSignalData?.priority || "N/A"}`}

    </small>


    {/* RECOMMENDED CORRIDOR */}

    {trafficSignalData?.emergencyVehicleDetected && (

      <small className="ai-route-info">

        🚑 Emergency Corridor: Junction B → Junction C

      </small>

    )}

  </div>

</div>

          </div>

        </main>

      </div>

    </div>
  );
}
// ============================================================
// ROUTE OPTIMIZATION PAGE
// ============================================================

if (page === "route-optimization") {
  return (
    <div className="dashboard">

      {/* HEADER */}
      {/* HEADER */}
<header className="dashboard-header">

  {/* LEFT - BRAND */}
  <div className="header-left">

    <div className="brand-header">

      <div className="brand-title">
        🚦 IntelliTraffic
      </div>

      <div className="brand-tagline">
        Smarter Traffic. Faster Response. Safer Roads.
      </div>

    </div>

  </div>

  {/* CENTER - SEARCH */}
  <div className="header-search">

    <span>🔍</span>

    <input
      type="text"
      placeholder="Search..."
    />

    <span className="search-shortcut">
      Ctrl K
    </span>

  </div>

  {/* RIGHT - OPERATOR */}
  <div className="header-right">

    <span className="notification">
      🔔
    </span>

    <div className="operator">

      <div className="operator-avatar">
        👤
      </div>

      <div>
        <strong>
          {user?.name || "Operator"}
        </strong>

        <small>
          Control Room
        </small>
      </div>

    </div>

    <button
      className="logout-small"
      onClick={handleLogout}
    >
      Logout
    </button>

  </div>

</header>


      <div className="dashboard-body">

        {/* SIDEBAR */}
        <aside className="sidebar">

          
          <nav>

            <button
              className="sidebar-item"
              onClick={() => setPage("dashboard")}
            >
              🏠
              <span>Dashboard</span>
            </button>


            <button
              className="sidebar-item"
              onClick={() => setPage("live-detection")}
            >
              📹
              <span>Live Detection</span>
            </button>


            <button
              className="sidebar-item"
              onClick={() => setPage("traffic-signals")}
            >
              🚦
              <span>Traffic Signals</span>
            </button>


            <button
              className="sidebar-item active"
              onClick={() => setPage("route-optimization")}
            >
              🛣️
              <span>Route Optimization</span>
            </button>


           <button
  className="sidebar-item"
  onClick={() => setPage("hospitals")}
>
  🏥
  <span>Hospitals</span>
</button>


            <button className="sidebar-item">
              🚨
              <span>Police Alerts</span>
            </button>


            <button className="sidebar-item">
              📊
              <span>Reports & Analytics</span>
            </button>


            <button className="sidebar-item">
              ⚙️
              <span>Settings</span>
            </button>

          </nav>


          

        </aside>


        {/* MAIN CONTENT */}
        <main className="dashboard-content">

          <div className="welcome-section">

            <h2>
              Route Optimization
            </h2>

            <p>
              AI-powered route planning for emergency vehicles.
            </p>

          </div>


          {/* EMERGENCY VEHICLE */}
          <div className="panel">

            <div className="panel-header">

              <h3>
                🚑 Emergency Vehicle
              </h3>

              <span className="active-badge">
  {trafficSignalData?.emergencyVehicleDetected
    ? "HIGH PRIORITY"
    : "STANDBY"}
</span>

            </div>


            <div className="route-location-grid">

              <div className="route-location">

                <span>
                  📍 Current Location
                </span>

                <strong>
  {trafficSignalData?.routeOptimization?.currentLocation
    || "Monitoring..."}
</strong>

                <small>
  {trafficSignalData?.routeOptimization?.currentLocation
    ? "Emergency Vehicle Location"
    : "Waiting for detection"}
</small>

              </div>


              <div className="route-arrow">
                →
              </div>


              <div className="route-location">

                <span>
                  🏥 Destination
                </span>

                <strong>
  {trafficSignalData?.routeOptimization?.destination
    || "City Hospital"}
</strong>

<small>
  {trafficSignalData?.routeOptimization?.destinationType
    || "Emergency Department"}
</small>

              </div>

            </div>

          </div>


          {/* AVAILABLE ROUTES */}
          <div className="panel">

            <div className="panel-header">

              <h3>
                🛣️ Available Routes
              </h3>

              <span className="live-status">
                ● LIVE TRAFFIC
              </span>

            </div>


            {/* ROUTE A */}
            <div
  className={
    trafficSignalData?.emergencyVehicleDetected
      ? "route-card recommended"
      : "route-card"
  }
>

              <div className="route-number">
                1
              </div>

              <div className="route-details">

  <strong>
    {trafficSignalData?.routeOptimization?.routes?.A?.name
      || "Route A — Main Road"}
  </strong>

  <p>
    {trafficSignalData?.routeOptimization?.routes?.A?.path
      || "Monitoring traffic routes"}
  </p>

  <div className="route-info">

    <span>
      {trafficSignalData?.routeOptimization?.routes?.A?.traffic === "LOW"
        ? "🟢 Low Traffic"
        : trafficSignalData?.routeOptimization?.routes?.A?.traffic === "MEDIUM"
        ? "🟡 Medium Traffic"
        : "🔴 High Traffic"}
    </span>

    <span>
      📏{" "}
      {trafficSignalData?.routeOptimization?.routes?.A?.distance ?? "--"} km
    </span>

    <span>
      ⏱️{" "}
      {trafficSignalData?.routeOptimization?.routes?.A?.estimatedTime ?? "--"} mins
    </span>

  </div>

</div>

              {trafficSignalData?.emergencyVehicleDetected && (
  <div className="recommended-label">
    🤖 AI Recommended
  </div>
)}

            </div>


            {/* ROUTE B */}
            <div className="route-card">

  <div className="route-number">
    2
  </div>

  <div className="route-details">

    <strong>
      {trafficSignalData?.routeOptimization?.routes?.B?.name
        || "Route B — Ring Road"}
    </strong>

    <p>
      {trafficSignalData?.routeOptimization?.routes?.B?.path
        || "Monitoring traffic routes"}
    </p>

    <div className="route-info">

      <span>
        {trafficSignalData?.routeOptimization?.routes?.B?.traffic === "LOW"
          ? "🟢 Low Traffic"
          : trafficSignalData?.routeOptimization?.routes?.B?.traffic === "MEDIUM"
          ? "🟡 Medium Traffic"
          : "🔴 High Traffic"}
      </span>

      <span>
        📏{" "}
        {trafficSignalData?.routeOptimization?.routes?.B?.distance ?? "--"} km
      </span>

      <span>
        ⏱️{" "}
        {trafficSignalData?.routeOptimization?.routes?.B?.estimatedTime ?? "--"} mins
      </span>

    </div>

  </div>

</div>


            {/* ROUTE C */}
           <div className="route-card">

  <div className="route-number">
    3
  </div>

  <div className="route-details">

    <strong>
      {trafficSignalData?.routeOptimization?.routes?.C?.name
        || "Route C — Highway"}
    </strong>

    <p>
      {trafficSignalData?.routeOptimization?.routes?.C?.path
        || "Monitoring traffic routes"}
    </p>

    <div className="route-info">

      <span>
        {trafficSignalData?.routeOptimization?.routes?.C?.traffic === "LOW"
          ? "🟢 Low Traffic"
          : trafficSignalData?.routeOptimization?.routes?.C?.traffic === "MEDIUM"
          ? "🟡 Medium Traffic"
          : "🔴 High Traffic"}
      </span>

      <span>
        📏{" "}
        {trafficSignalData?.routeOptimization?.routes?.C?.distance ?? "--"} km
      </span>

      <span>
        ⏱️{" "}
        {trafficSignalData?.routeOptimization?.routes?.C?.estimatedTime ?? "--"} mins
      </span>

    </div>

  </div>

</div>

          </div>


          {/* AI RECOMMENDATION + MAP */}
          <div className="route-bottom-grid">

            {/* AI RECOMMENDATION */}
            <div className="panel">

              <div className="panel-header">

                <h3>
                  🤖 AI Route Recommendation
                </h3>

                <span className="active-badge">
  {trafficSignalData?.routeOptimization?.active
    ? "OPTIMIZED"
    : "STANDBY"}
</span>

              </div>


              <div className="ai-route-box">

                <div className="ai-route-icon">
                  🚑
                </div>

                <div>

                  <strong>
  {trafficSignalData?.routeOptimization?.recommendedRoute ||
    "Monitoring Traffic Routes"}
</strong>

<p>
  {trafficSignalData?.routeOptimization?.reason ||
    "AI is monitoring traffic density, distance and estimated travel time to determine the optimal emergency route."}
</p>
                </div>

              </div>


              <div className="route-stats">

                <div>

                  <small>
                    Distance
                  </small>

                  <strong>
  {trafficSignalData?.routeOptimization?.routes?.A?.distance ?? "--"} km
</strong>

                </div>


                <div>

                  <small>
                    Estimated Time
                  </small>

                  <strong>
  {trafficSignalData?.routeOptimization?.routes?.A?.estimatedTime ?? "--"} mins
</strong>

                </div>


                <div>

                  <small>
                    Time Saved
                  </small>

                 <strong>
  {trafficSignalData?.routeOptimization?.timeSaved ?? "--"} mins
</strong>

                </div>

              </div>


              <button
  className="activate-route-button"
  disabled={!trafficSignalData?.emergencyVehicleDetected}
>
  {trafficSignalData?.emergencyVehicleDetected
    ? "🟢 Activate Emergency Route"
    : "⏸️ Emergency Route Standby"}
</button>

            </div>


            {/* ROUTE MAP */}
            <div className="panel">

              <div className="panel-header">

                <h3>
                  🗺️ Route Overview
                </h3>

                <span className="live-status">
                  ● LIVE
                </span>

              </div>


              <div className="route-map">

                <div className="route-road route-road-1"></div>

                <div className="route-road route-road-2"></div>

                <div className="route-road route-road-3"></div>


                <span className="route-marker start">
                  🚑
                </span>

                <span className="route-marker junction-a">
                  🚦
                </span>

                <span className="route-marker junction-b">
                  🚦
                </span>

                <span className="route-marker hospital">
                  🏥
                </span>


                <div className="route-map-label start-label">
                  Junction B
                </div>

                <div className="route-map-label hospital-label">
                  City Hospital
                </div>

              </div>

            </div>

          </div>


          {/* AI STATUS */}
          <div className="panel route-ai-status">

            <div className="route-ai-status-icon">
              🤖
            </div>

            <div>

              <strong>
  {trafficSignalData?.routeOptimization?.active
    ? "🚑 Emergency Route Optimization Active"
    : "🤖 AI Traffic Analysis Active"}
</strong>

<p>
  {trafficSignalData?.routeOptimization?.active
    ? "An emergency vehicle has been detected. AI is prioritizing the fastest route and coordinating the emergency corridor."
    : "AI is monitoring traffic density, distance and estimated travel time to determine the optimal emergency route."}
</p>

            </div>

            <span className="detection-online">
              ● SYSTEM ACTIVE
            </span>

          </div>

        </main>

      </div>

    </div>
  );
}


// ============================================================
// HOSPITALS PAGE
// ============================================================

if (page === "hospitals") {
  return (
    <div className="dashboard">

      {/* HEADER */}
      {/* HEADER */}
<header className="dashboard-header">

  {/* LEFT - BRAND */}
  <div className="header-left">

    <div className="brand-header">

      <div className="brand-title">
        🚦 IntelliTraffic
      </div>

      <div className="brand-tagline">
        Smarter Traffic. Faster Response. Safer Roads.
      </div>

    </div>

  </div>

  {/* CENTER - SEARCH */}
  <div className="header-search">

    <span>🔍</span>

    <input
      type="text"
      placeholder="Search..."
    />

    <span className="search-shortcut">
      Ctrl K
    </span>

  </div>

  {/* RIGHT - OPERATOR */}
  <div className="header-right">

    <span className="notification">
      🔔
    </span>

    <div className="operator">

      <div className="operator-avatar">
        👤
      </div>

      <div>
        <strong>
          {user?.name || "Operator"}
        </strong>

        <small>
          Control Room
        </small>
      </div>

    </div>

    <button
      className="logout-small"
      onClick={handleLogout}
    >
      Logout
    </button>

  </div>

</header>

      <div className="dashboard-body">

        {/* SIDEBAR */}
        <aside className="sidebar">

          

          <nav>

            <button
              className="sidebar-item"
              onClick={() => setPage("dashboard")}
            >
              🏠
              <span>Dashboard</span>
            </button>

            <button
              className="sidebar-item"
              onClick={() => setPage("live-detection")}
            >
              📹
              <span>Live Detection</span>
            </button>

            <button
              className="sidebar-item"
              onClick={() => setPage("traffic-signals")}
            >
              🚦
              <span>Traffic Signals</span>
            </button>

            <button
              className="sidebar-item"
              onClick={() => setPage("route-optimization")}
            >
              🛣️
              <span>Route Optimization</span>
            </button>

            <button
              className="sidebar-item active"
              onClick={() => setPage("hospitals")}
            >
              🏥
              <span>Hospitals</span>
            </button>

            <button
  className="sidebar-item"
  onClick={() => setPage("police-alerts")}
>
  🚨
  <span>Police Alerts</span>
</button>

            <button className="sidebar-item">
              📊
              <span>Reports & Analytics</span>
            </button>

            <button className="sidebar-item">
              ⚙️
              <span>Settings</span>
            </button>

          </nav>

          

        </aside>

        {/* MAIN CONTENT */}
        <main className="dashboard-content">

          <div className="welcome-section">

            <h2>
              Hospital Management
            </h2>

            <p>
              Monitor nearby hospitals and emergency availability.
            </p>

          </div>

          {/* RECOMMENDED HOSPITAL */}
          <div className="panel recommended-hospital">

            <div className="panel-header">

              <h3>
                🤖 AI Recommended Hospital
              </h3>

              <span className="active-badge">
                Recommended
              </span>

            </div>

            <div className="hospital-recommendation">

  <div className="hospital-icon">
    🏥
  </div>

  <div className="hospital-info">

    <h3>
      {hospitalData?.recommendedHospital?.name
        || "Finding Hospital..."}
    </h3>

    <p>
      📍{" "}
      {hospitalData?.recommendedHospital
        ? `${hospitalData.recommendedHospital.distance} km from emergency vehicle`
        : "Calculating distance..."}
    </p>

    <p>
      🛏️{" "}
      {hospitalData?.recommendedHospital
        ? `${hospitalData.recommendedHospital.emergencyBeds} emergency beds available`
        : "Checking bed availability..."}
    </p>

    <span className="hospital-available">
      ●{" "}
      {hospitalData?.recommendedHospital
        ? hospitalData.recommendedHospital.status === "AVAILABLE"
          ? "Emergency Facility Available"
          : hospitalData.recommendedHospital.status
        : "Checking availability..."}
    </span>

  </div>

 <button
  className="notify-hospital-button"
  onClick={() =>
    hospitalData?.recommendedHospital?.id &&
    notifyHospital(
      hospitalData.recommendedHospital.id
    )
  }
  disabled={
    !hospitalData?.recommendedHospital?.id ||
    notifiedHospitals.includes(
      hospitalData.recommendedHospital.id
    )
  }
>
  {notifiedHospitals.includes(
    hospitalData?.recommendedHospital?.id
  )
    ? "✓ Hospital Notified"
    : "🚑 Notify Hospital"}
</button>

</div>

          </div>

          {/* HOSPITAL STATISTICS */}
          <div className="stats-grid">

            <div className="traffic-card">

              <div className="card-icon">
                🏥
              </div>

              <h4>
                Nearby Hospitals
              </h4>

             <strong>
  {hospitalData?.statistics?.nearbyHospitals ?? "--"}
</strong>

              <p>
                Within 10 km
              </p>

            </div>

            <div className="traffic-card">

              <div className="card-icon">
                🛏️
              </div>

              <h4>
                Emergency Beds
              </h4>

              <strong>
  {hospitalData?.statistics?.emergencyBeds ?? "--"}
</strong>

              <p>
                Currently Available
              </p>

            </div>

            <div className="traffic-card">

              <div className="card-icon">
                🚑
              </div>

              <h4>
                Emergency Facilities
              </h4>

              <strong>
  {hospitalData?.statistics?.emergencyFacilities ?? "--"}
</strong>

              <p>
                Hospitals Available
              </p>

            </div>

            <div className="traffic-card">

              <div className="card-icon">
                📢
              </div>

              <h4>
                Hospitals Notified
              </h4>

              <strong>
  {hospitalData?.statistics?.hospitalsNotified ?? 0}
</strong>

              <p>
                Today
              </p>

            </div>

          </div>

          {/* AVAILABLE HOSPITALS */}
          <div className="panel">

            <div className="panel-header">

              <h3>
                🏥 Available Hospitals
              </h3>

              <span className="live-status">
                ● Live Status
              </span>

            </div>

            <div className="hospital-list">

  {hospitalData?.hospitals?.map((hospital) => (

    <div
      className="hospital-item"
      key={hospital.id}
    >

      <div className="hospital-list-icon">
        🏥
      </div>

      <div className="hospital-list-info">

        <div className="hospital-name-row">

  <strong>
    {hospital.name}
  </strong>

  {notifyingHospitalId === hospital.id && (
    <span className="hospital-notifying">
      ⏳ Notifying...
    </span>
  )}

  {notifiedHospitals.includes(hospital.id) &&
    notifyingHospitalId !== hospital.id && (
      <span className="hospital-notified">
        ✓ Notified
      </span>
    )}

</div>

        <p>
          📍 {hospital.distance} km
        </p>

        <span
          className={
            hospital.status === "AVAILABLE"
              ? "hospital-available"
              : hospital.status === "LIMITED"
              ? "hospital-limited"
              : "hospital-full"
          }
        >
          ● {hospital.emergencyBeds} Emergency Beds
        </span>

      </div>

      <div className="hospital-status">

        <span
          className={
            hospital.status === "AVAILABLE"
              ? "status-available"
              : hospital.status === "LIMITED"
              ? "status-limited"
              : "status-full"
          }
        >
          {hospital.status}
        </span>

{hospital.status === "FULL" ? (

  <button
    className="notify-small"
    disabled
  >
    Full
  </button>

) : notifiedHospitals.includes(hospital.id) ? (

  <button
    className="notify-small cancel-notify-button"
    onClick={() =>
      cancelHospitalNotification(hospital.id)
    }
    disabled={cancellingHospitalId !== null}
  >
    {cancellingHospitalId === hospital.id
      ? "⏳ Cancelling..."
      : "✕ Cancel Notification"}
  </button>

) : (

  <button
    className="notify-small"
    onClick={() =>
      notifyHospital(hospital.id)
    }
    disabled={notifyingHospitalId !== null}
  >
    {notifyingHospitalId === hospital.id
      ? "⏳ Notifying..."
      : "Notify"}
  </button>

)}

      </div>

    </div>

  ))}

</div>

          </div>

        </main>

      </div>

    </div>
  );
}

// ============================================================
// POLICE ALERTS PAGE
// ============================================================

if (page === "police-alerts") {
  return (
    <div className="dashboard">

      {/* HEADER */}
      {/* HEADER */}
<header className="dashboard-header">

  {/* LEFT - BRAND */}
  <div className="header-left">

    <div className="brand-header">

      <div className="brand-title">
        🚦 IntelliTraffic
      </div>

      <div className="brand-tagline">
        Smarter Traffic. Faster Response. Safer Roads.
      </div>

    </div>

  </div>

  {/* CENTER - SEARCH */}
  <div className="header-search">

    <span>🔍</span>

    <input
      type="text"
      placeholder="Search..."
    />

    <span className="search-shortcut">
      Ctrl K
    </span>

  </div>

  {/* RIGHT - OPERATOR */}
  <div className="header-right">

    <span className="notification">
      🔔
    </span>

    <div className="operator">

      <div className="operator-avatar">
        👤
      </div>

      <div>
        <strong>
          {user?.name || "Operator"}
        </strong>

        <small>
          Control Room
        </small>
      </div>

    </div>

    <button
      className="logout-small"
      onClick={handleLogout}
    >
      Logout
    </button>

  </div>

</header>

      <div className="dashboard-body">

        {/* SIDEBAR */}
        <aside className="sidebar">

          

          <nav>

            <button
              className="sidebar-item"
              onClick={() => setPage("dashboard")}
            >
              🏠
              <span>Dashboard</span>
            </button>

            <button
              className="sidebar-item"
              onClick={() => setPage("live-detection")}
            >
              📹
              <span>Live Detection</span>
            </button>

            <button
              className="sidebar-item"
              onClick={() => setPage("traffic-signals")}
            >
              🚦
              <span>Traffic Signals</span>
            </button>

            <button
              className="sidebar-item"
              onClick={() => setPage("route-optimization")}
            >
              🛣️
              <span>Route Optimization</span>
            </button>

            <button
              className="sidebar-item"
              onClick={() => setPage("hospitals")}
            >
              🏥
              <span>Hospitals</span>
            </button>

            <button
              className="sidebar-item active"
              onClick={() => setPage("police-alerts")}
            >
              🚨
              <span>Police Alerts</span>
            </button>

            <button
  className="sidebar-item"
  onClick={() => setPage("reports")}
>
  📊
  <span>Reports & Analytics</span>
</button>

            <button
  className="sidebar-item"
  onClick={() => setPage("settings")}
>
  ⚙️
  <span>Settings</span>
</button>

          </nav>

          
        </aside>

        {/* MAIN CONTENT */}
        <main className="dashboard-content">

          <div className="welcome-section">

            <h2>
              Police Alerts
            </h2>

            <p>
              Monitor emergency incidents and coordinate
              police response.
            </p>

          </div>

          {/* STATISTICS */}
          <div className="stats-grid">

            <div className="traffic-card">

              <div className="card-icon">
                🚨
              </div>

              <h4>
                Active Alerts
              </h4>

              <strong>
  {policeAlertData?.statistics?.activeAlerts ?? "--"}
</strong>

              <p>
                Requiring attention
              </p>

            </div>

            <div className="traffic-card">

              <div className="card-icon">
                🚔
              </div>

              <h4>
                Police Units
              </h4>

              <strong>
  {policeAlertData?.statistics?.policeUnits ?? "--"}
</strong>

              <p>
                Currently available
              </p>

            </div>

            <div className="traffic-card">

              <div className="card-icon">
                ⚠️
              </div>

              <h4>
                High Priority
              </h4>

              <strong>
  {policeAlertData?.statistics?.highPriority ?? "--"}
</strong>

              <p>
                Critical incidents
              </p>

            </div>

            <div className="traffic-card">

              <div className="card-icon">
                ✅
              </div>

              <h4>
                Resolved Today
              </h4>

             <strong>
  {policeAlertData?.statistics?.resolvedToday ?? "--"}
</strong>

              <p>
                Incidents resolved
              </p>

            </div>

          </div>

          {/* ACTIVE EMERGENCY */}
          <div className="panel">

            <div className="panel-header">

              <h3>
                🚨 Active Emergency Alert
              </h3>

              <span className="active-badge">
  {policeAlertData?.activeEmergency?.priority ||
    "NORMAL"}
</span>

            </div>

            <div className="police-alert-main">

              <div className="police-alert-icon">
                🚑
              </div>

              <div className="police-alert-info">

                <h3>
  {policeAlertData?.activeEmergency?.type ||
    "No Active Emergency"}
</h3>

                <p>
  📍 {policeAlertData?.activeEmergency?.location ||
    "Monitoring..."}
</p>

                <p>
  🚑 {policeAlertData?.activeEmergency?.message ||
    "No active emergency information available."}
</p>

                <span className="alert-time">
  ⏱️ Alert received at{" "}
  {policeAlertData?.activeEmergency?.time || "--"}
</span>

              </div>

              <div className="police-response">

                <strong>
  🚔 {policeAlertData?.activeEmergency?.unit ||
    "No Unit Assigned"}
</strong>

<p>
  {policeAlertData?.activeEmergency?.distance ?? "--"} km away
</p>

<span className="responding-status">
  ● {policeAlertData?.activeEmergency?.status ||
    "STANDBY"}
</span>

              </div>

            </div>

            <div className="police-action-buttons">

              <button
  className="send-alert-button"
  onClick={sendPoliceAlert}
>
  🚨 Send Police Alert
</button>

              <button
  className="resolve-alert-button"
  onClick={resolvePoliceAlert}
>
  ✓ Mark Resolved
</button>

            </div>

          </div>

          {/* RECENT ALERTS */}
          <div className="panel">

            <div className="panel-header">

              <h3>
                📋 Recent Police Alerts
              </h3>

              <span className="live-status">
                ● Live Updates
              </span>

            </div>

            <div className="police-alert-list">

              

  {policeAlertData?.recentAlerts?.length > 0 ? (

    policeAlertData.recentAlerts.map((alert, index) => (

      <div className="police-alert-item" key={index}>

        <div className="alert-item-icon">
          {alert.icon}
        </div>

        <div className="alert-item-info">

          <strong>
            {alert.title}
          </strong>

          <p>
            {alert.location}
          </p>

          <small>
            {alert.time}
          </small>

        </div>

        <span
          className={`alert-status ${
            alert.status.toLowerCase()
          }`}
        >
          {alert.status}
        </span>

      </div>

    ))

  ) : (

    <div className="no-alerts">
      No recent police alerts.
    </div>

  )}

</div>

            </div>

        </main>

      </div>

    </div>
  );
}

// ============================================================
// REPORTS & ANALYTICS PAGE
// ============================================================

if (page === "reports") {
  return (
    <div className="dashboard">

      {/* HEADER */}
      {/* HEADER */}
<header className="dashboard-header">

  {/* LEFT - BRAND */}
  <div className="header-left">

    <div className="brand-header">

      <div className="brand-title">
        🚦 IntelliTraffic
      </div>

      <div className="brand-tagline">
        Smarter Traffic. Faster Response. Safer Roads.
      </div>

    </div>

  </div>

  {/* CENTER - SEARCH */}
  <div className="header-search">

    <span>🔍</span>

    <input
      type="text"
      placeholder="Search..."
    />

    <span className="search-shortcut">
      Ctrl K
    </span>

  </div>

  {/* RIGHT - OPERATOR */}
  <div className="header-right">

    <span className="notification">
      🔔
    </span>

    <div className="operator">

      <div className="operator-avatar">
        👤
      </div>

      <div>
        <strong>
          {user?.name || "Operator"}
        </strong>

        <small>
          Control Room
        </small>
      </div>

    </div>

    <button
      className="logout-small"
      onClick={handleLogout}
    >
      Logout
    </button>

  </div>

</header>

      <div className="dashboard-body">

        {/* SIDEBAR */}
        <aside className="sidebar">

         

          <nav>

            <button
              className="sidebar-item"
              onClick={() => setPage("dashboard")}
            >
              🏠
              <span>Dashboard</span>
            </button>

            <button
              className="sidebar-item"
              onClick={() => setPage("live-detection")}
            >
              📹
              <span>Live Detection</span>
            </button>

            <button
              className="sidebar-item"
              onClick={() => setPage("traffic-signals")}
            >
              🚦
              <span>Traffic Signals</span>
            </button>

            <button
              className="sidebar-item"
              onClick={() => setPage("route-optimization")}
            >
              🛣️
              <span>Route Optimization</span>
            </button>

            <button
              className="sidebar-item"
              onClick={() => setPage("hospitals")}
            >
              🏥
              <span>Hospitals</span>
            </button>

            <button
              className="sidebar-item"
              onClick={() => setPage("police-alerts")}
            >
              🚨
              <span>Police Alerts</span>
            </button>

            <button
              className="sidebar-item active"
              onClick={() => setPage("reports")}
            >
              📊
              <span>Reports & Analytics</span>
            </button>

           <button
  className="sidebar-item"
  onClick={() => setPage("settings")}
>
  ⚙️
  <span>Settings</span>
</button>

          </nav>

          

        </aside>

        {/* MAIN CONTENT */}
        <main className="dashboard-content">

          <div className="welcome-section">

            <h2>
              Reports & Analytics
            </h2>

            <p>
              Analyze emergency traffic activity,
              response performance and traffic conditions.
            </p>

          </div>

          {/* REPORT FILTER */}
          <div className="report-filter">

            <div>
              <strong>
                Report Period
              </strong>

              <p>
                Select the period for analysis
              </p>
            </div>

            <select
  onChange={(e) => {
    console.log(
      "Selected report period:",
      e.target.value
    );
  }}
>

  <option value="today">
    Today
  </option>

  <option value="week">
    This Week
  </option>

  <option value="month">
    This Month
  </option>

</select>

          </div>

          {/* STATISTICS */}
         {/* STATISTICS */}

<div className="stats-grid">

  <div className="traffic-card">

    <div className="card-icon">
      🚑
    </div>

    <h4>
      Emergency Vehicles
    </h4>

    <strong>
      {reportData?.statistics?.emergencyVehicles ?? "--"}
    </strong>

    <p>
      Currently Detected
    </p>

    <span className="increase">
      AI Detection
    </span>

  </div>


  <div className="traffic-card">

    <div className="card-icon">
      🚦
    </div>

    <h4>
      Signal Activations
    </h4>

    <strong>
      {reportData?.statistics?.signalActivations ?? "--"}
    </strong>

    <p>
      Emergency Priority
    </p>

    <span className="increase">
      AI Controlled
    </span>

  </div>


  <div className="traffic-card">

    <div className="card-icon">
      🟢
    </div>

    <h4>
      Green Corridors
    </h4>

    <strong>
      {reportData?.statistics?.greenCorridors ?? "--"}
    </strong>

    <p>
      Successfully Activated
    </p>

    <span className="increase">
      Emergency Route
    </span>

  </div>


  <div className="traffic-card">

    <div className="card-icon">
      🚨
    </div>

    <h4>
      Police Alerts
    </h4>

    <strong>
      {reportData?.statistics?.policeAlerts ?? "--"}
    </strong>

    <p>
      Active Emergency Alerts
    </p>

    <span className="increase">
      Police Response
    </span>

  </div>

</div>
          {/* ANALYTICS SECTION */}
          <div className="dashboard-grid">

            {/* TRAFFIC DENSITY */}
            <div className="panel">

              <div className="panel-header">

                <h3>
                  🚗 Traffic Density Overview
                </h3>

                <span className="active-badge">
                  AI Analysis
                </span>

              </div>

              <div className="analytics-chart">

  {reportData?.traffic?.chart?.map(
    (item, index) => (

      <div
        className="bar-item"
        key={index}
      >

        <span>
          {item.time}
        </span>

        <div className="bar">

          <div
            className="bar-fill"
            style={{
              height:
                `${item.density}%`
            }}
          ></div>

        </div>

      </div>

    )
  )}

</div>

              <div className="analytics-summary">

                <strong>
  {reportData?.traffic?.currentDensity || "--"}
</strong>

<p>
  AI-generated traffic density analysis
  based on current traffic conditions.
</p>

              </div>

            </div>

            {/* RESPONSE PERFORMANCE */}
            <div className="panel">

              <div className="panel-header">

                <h3>
                  ⏱️ Emergency Response Performance
                </h3>

              </div>

              <div className="response-performance">

                <div className="performance-circle">
                  <strong>
  {reportData?.response?.efficiency ?? "--"}%
</strong>

                  <span>
                    Efficiency
                  </span>
                </div>

                <div className="performance-details">

                  <div>
                    <small>
                      Average Response Time
                    </small>

                    <strong>
  {reportData?.response?.averageTime || "--"}
</strong>
                  </div>

                  <div>
                    <small>
                      Target Response Time
                    </small>

                    <strong>
  {reportData?.response?.targetTime || "--"}
</strong>
                  </div>

                  <div>
                    <small>
                      Improvement
                    </small>

                    <strong className="improvement">
  ↓ {reportData?.response?.improvement || "0%"}
</strong>
                  </div>

                </div>

              </div>

            </div>

          </div>

          {/* INCIDENT REPORT */}
          <div className="panel">

            <div className="panel-header">

              <h3>
                📋 Recent Emergency Incidents
              </h3>

              <span className="live-status">
                ● Live Data
              </span>

            </div>

            <div className="incident-table">

  <div className="incident-row incident-header">

    <span>
      Incident
    </span>

    <span>
      Location
    </span>

    <span>
      Response Time
    </span>

    <span>
      Status
    </span>

  </div>


  {reportData?.incidents?.map(
    (incident, index) => (

      <div
        className="incident-row"
        key={index}
      >

        <span>
          {incident.icon}{" "}
          {incident.incident}
        </span>

        <span>
          {incident.location}
        </span>

        <span>
          {incident.responseTime}
        </span>

        <span
          className={
            incident.status === "Active"
              ? "status-active"
              : "status-success"
          }
        >
          {incident.status}
        </span>

      </div>

    )
  )}

</div>

</div>

          {/* AI SUMMARY */}
          <div className="panel analytics-ai-summary">

            <div className="panel-header">

              <h3>
                🤖 AI Traffic Summary
              </h3>

              <span className="active-badge">
                AI Generated
              </span>

            </div>

            <p>
  {reportData?.aiSummary ||
    "AI traffic analysis is currently loading."}
</p>

          </div>

        </main>

      </div>

    </div>
  );
}

// ============================================================
// SETTINGS PAGE
// ============================================================

if (page === "settings") {
  return (
    <div className="dashboard">

      {/* HEADER */}
      {/* HEADER */}
<header className="dashboard-header">

  {/* LEFT - BRAND */}
  <div className="header-left">

    <div className="brand-header">

      <div className="brand-title">
        🚦 IntelliTraffic
      </div>

      <div className="brand-tagline">
        Smarter Traffic. Faster Response. Safer Roads.
      </div>

    </div>

  </div>

  {/* CENTER - SEARCH */}
  <div className="header-search">

    <span>🔍</span>

    <input
      type="text"
      placeholder="Search..."
    />

    <span className="search-shortcut">
      Ctrl K
    </span>

  </div>

  {/* RIGHT - OPERATOR */}
  <div className="header-right">

    <span className="notification">
      🔔
    </span>

    <div className="operator">

      <div className="operator-avatar">
        👤
      </div>

      <div>
        <strong>
          {user?.name || "Operator"}
        </strong>

        <small>
          Control Room
        </small>
      </div>

    </div>

    <button
      className="logout-small"
      onClick={handleLogout}
    >
      Logout
    </button>

  </div>

</header>

      <div className="dashboard-body">

        {/* SIDEBAR */}
        <aside className="sidebar">

          

          <nav>

            <button
              className="sidebar-item"
              onClick={() => setPage("dashboard")}
            >
              🏠
              <span>Dashboard</span>
            </button>

            <button
              className="sidebar-item"
              onClick={() => setPage("live-detection")}
            >
              📹
              <span>Live Detection</span>
            </button>

            <button
              className="sidebar-item"
              onClick={() => setPage("traffic-signals")}
            >
              🚦
              <span>Traffic Signals</span>
            </button>

            <button
              className="sidebar-item"
              onClick={() => setPage("route-optimization")}
            >
              🛣️
              <span>Route Optimization</span>
            </button>

            <button
              className="sidebar-item"
              onClick={() => setPage("hospitals")}
            >
              🏥
              <span>Hospitals</span>
            </button>

            <button
              className="sidebar-item"
              onClick={() => setPage("police-alerts")}
            >
              🚨
              <span>Police Alerts</span>
            </button>

            <button
              className="sidebar-item"
              onClick={() => setPage("reports")}
            >
              📊
              <span>Reports & Analytics</span>
            </button>

            <button
              className="sidebar-item active"
              onClick={() => setPage("settings")}
            >
              ⚙️
              <span>Settings</span>
            </button>

          </nav>

          

        </aside>

        {/* MAIN CONTENT */}
        <main className="dashboard-content">

          <div className="welcome-section">

            <h2>
              System Settings
            </h2>

            <p>
              Manage IntelliTraffic system preferences and control room settings.
            </p>

          </div>

          {/* PROFILE SETTINGS */}
          <div className="panel">

            <div className="panel-header">
              <h3>👤 Profile Settings</h3>
            </div>

            <div className="settings-form">

              <label>
                Full Name
              </label>

              <input
                type="text"
                value={user?.name || ""}
                readOnly
              />

              <label>
                Email Address
              </label>

              <input
                type="email"
                value={user?.email || ""}
                readOnly
              />

            </div>

          </div>

          {/* SYSTEM SETTINGS */}
          {/* SYSTEM SETTINGS */}
<div className="panel">

  <div className="panel-header">
    <h3>⚙️ System Preferences</h3>
  </div>


  {/* APPEARANCE */}
  <div className="setting-row">

    <div>
      <strong>Appearance</strong>

      <p>
        Choose the appearance of the IntelliTraffic control panel.
      </p>
    </div>

    <div className="theme-selector">

      <button
        className={
          theme === "light"
            ? "theme-button active"
            : "theme-button"
        }
        onClick={() => setTheme("light")}
      >
        ☀️ Light
      </button>

      <button
        className={
          theme === "dark"
            ? "theme-button active"
            : "theme-button"
        }
        onClick={() => setTheme("dark")}
      >
        🌙 Dark
      </button>

    </div>

  </div>


  {/* AI DETECTION */}
  <div className="setting-row">

    <div>
      <strong>AI Detection</strong>

      <p>
        Enable AI-powered traffic detection.
      </p>
    </div>

    <label className="switch">

      <input
        type="checkbox"
        checked={aiDetectionEnabled}
        onChange={(e) =>
          setAiDetectionEnabled(e.target.checked)
        }
      />

      <span className="slider"></span>

    </label>

  </div>


  {/* EMERGENCY ALERTS */}
  <div className="setting-row">

    <div>
      <strong>Emergency Alerts</strong>

      <p>
        Receive alerts when emergency vehicles are detected.
      </p>
    </div>

    <label className="switch">

      <input
        type="checkbox"
        checked={emergencyAlertsEnabled}
        onChange={(e) =>
          setEmergencyAlertsEnabled(e.target.checked)
        }
      />

      <span className="slider"></span>

    </label>

  </div>


  {/* TRAFFIC NOTIFICATIONS */}
  <div className="setting-row">

    <div>
      <strong>Traffic Notifications</strong>

      <p>
        Receive notifications about high traffic density.
      </p>
    </div>

    <label className="switch">

      <input
        type="checkbox"
        checked={trafficNotificationsEnabled}
        onChange={(e) =>
          setTrafficNotificationsEnabled(e.target.checked)
        }
      />

      <span className="slider"></span>

    </label>

  </div>

</div>

{/* TRAFFIC MANAGEMENT SETTINGS */}
<div className="panel">

  <div className="panel-header">
    <h3>🚦 Traffic Management</h3>
  </div>


  {/* EMERGENCY PRIORITY */}
  <div className="setting-row">

    <div>
      <strong>Emergency Vehicle Priority</strong>

      <p>
        Automatically prioritize ambulances, fire brigades and police vehicles.
      </p>
    </div>

    <label className="switch">

      <input
        type="checkbox"
        defaultChecked
      />

      <span className="slider"></span>

    </label>

  </div>


  {/* GREEN CORRIDOR */}
  <div className="setting-row">

    <div>
      <strong>Automatic Green Corridor</strong>

      <p>
        Create a green signal corridor for emergency vehicles.
      </p>
    </div>

    <label className="switch">

      <input
        type="checkbox"
        defaultChecked
      />

      <span className="slider"></span>

    </label>

  </div>


  {/* AI SIGNAL CONTROL */}
  <div className="setting-row">

    <div>
      <strong>AI Traffic Signal Control</strong>

      <p>
        Allow AI to recommend traffic signal changes based on traffic conditions.
      </p>
    </div>

    <label className="switch">

      <input
        type="checkbox"
        defaultChecked
      />

      <span className="slider"></span>

    </label>

  </div>

</div>

          {/* SYSTEM INFORMATION */}
          <div className="panel">

            <div className="panel-header">
              <h3>🖥️ System Information</h3>
            </div>

            <div className="system-info">

              <div>
                <strong>System Status</strong>
                <span className="detection-online">
                  ● ONLINE
                </span>
              </div>

              <div>
                <strong>AI Engine</strong>
                <span>
                  Computer Vision
                </span>
              </div>

              <div>
                <strong>Traffic Monitoring</strong>
                <span>
                  Active
                </span>
              </div>

              <div>
                <strong>Version</strong>
                <span>
                  IntelliTraffic v1.0
                </span>
              </div>

            </div>

          </div>

        </main>

      </div>

    </div>
  );
}
  
  // ============================================================
  // LOGIN PAGE
  // ============================================================

  if (page === "login") {
    return (
      <div className="app">

        <div className="card login-card">

          <h1>
            Welcome Back
          </h1>

          <p>
            Login to IntelliTraffic
          </p>

          <form
            className="login-form"
            onSubmit={handleLogin}
          >

            <input
              type="email"
              name="email"
              placeholder="Email Address"
              value={loginData.email}
              onChange={handleLoginChange}
              required
            />

            <input
              type="password"
              name="password"
              placeholder="Password"
              value={loginData.password}
              onChange={handleLoginChange}
              required
            />

            <button type="submit">
              Login
            </button>

          </form>

          {message && (
            <p className="message">
              {message}
            </p>
          )}

          <button
            className="back-button"
            onClick={() => {
              setMessage("");
              setPage("home");
            }}
          >
            Back
          </button>

        </div>

      </div>
    );
  }

  // ============================================================
  // REGISTER PAGE
  // ============================================================

  if (page === "register") {
    return (
      <div className="app">

        <div className="card login-card">

          <h1>
            Create Account
          </h1>

          <p>
            Register for IntelliTraffic
          </p>

          <form
            className="login-form"
            onSubmit={handleRegister}
          >

            <input
              type="text"
              name="name"
              placeholder="Full Name"
              value={registerData.name}
              onChange={handleRegisterChange}
              required
            />

            <input
              type="email"
              name="email"
              placeholder="Email Address"
              value={registerData.email}
              onChange={handleRegisterChange}
              required
            />

            <input
              type="password"
              name="password"
              placeholder="Password"
              value={registerData.password}
              onChange={handleRegisterChange}
              required
            />

            <input
              type="password"
              name="confirmPassword"
              placeholder="Confirm Password"
              value={registerData.confirmPassword}
              onChange={handleRegisterChange}
              required
            />

            <button type="submit">
              Register
            </button>

          </form>

          {message && (
            <p className="message">
              {message}
            </p>
          )}

          <button
            className="back-button"
            onClick={() => {
              setMessage("");
              setPage("home");
            }}
          >
            Back
          </button>

        </div>

      </div>
    );
  }

  // ============================================================
  // HOME PAGE
  // ============================================================

  return (
    <div className="app">

      <div className="card">

        <h1>
          IntelliTraffic
        </h1>

        <p>
          AI-Powered Smart Emergency Traffic Management System
        </p>

        <div className="button-container">

          <button
            onClick={() => setPage("login")}
          >
            Login
          </button>

          <button
            onClick={() => setPage("register")}
          >
            Register
          </button>

        </div>

      </div>

    </div>
  );
}

export default App;