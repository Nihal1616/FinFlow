import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useNotifications } from "../context/NotificationContext";
import api from "../services/api";
import QRCode from "qrcode";
import jsQR from "jsqr";
import { Card, SectionTitle, Button } from "../components/ui";
import "./QRPay.css";

async function drawQR(canvas, user) {
  const payload = JSON.stringify({
    identifier: user.email,
    name: user.name,
  });
  try {
    await QRCode.toCanvas(canvas, payload, {
      width: 200,
      margin: 1,
      color: {
        dark: "#1a1a2e",
        light: "#ffffff",
      },
    });
  } catch (err) {
    console.error("QR draw failed", err);
  }
}

export default function QRPay() {
  const { user } = useAuth();
  const { addToast } = useNotifications();
  const navigate = useNavigate();
  const canvasRef = useRef(null);
  const videoRef = useRef(null);
  const scanCanvasRef = useRef(null);
  const scanFrameRef = useRef(null);
  const [users, setUsers] = useState([]);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    if (canvasRef.current && user) {
      drawQR(canvasRef.current, user);
    }
    // Fetch other users for simulate scan
    api
      .get("/users/search?q=a")
      .then((r) => setUsers(r.data.users))
      .catch(() => {});
  }, [user]);

  useEffect(() => {
    return () => {
      if (scanFrameRef.current) cancelAnimationFrame(scanFrameRef.current);
      if (videoRef.current?.srcObject) {
        videoRef.current.srcObject.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const downloadQR = () => {
    if (!canvasRef.current) return;
    const link = document.createElement("a");
    link.download = "finflow-qr.png";
    link.href = canvasRef.current.toDataURL();
    link.click();
    addToast("QR Code downloaded!", "success");
  };

  const copyLink = () => {
    const link = `https://finflow.app/pay/${user?._id}`;
    navigator.clipboard?.writeText(link);
    addToast("Payment link copied to clipboard!", "success");
  };

  const simulateScan = () => {
    if (users.length === 0) {
      addToast("No users available to scan", "info");
      return;
    }
    const random = users[Math.floor(Math.random() * users.length)];
    addToast(`Scanned ${random.name}'s QR code`, "info");
    navigate("/app/send", { state: { recipient: random } });
  };

  const startScan = async () => {
    if (scanning) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      addToast("Camera not supported", "error");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setScanning(true);
      scanFrame();
    } catch {
      addToast("Camera permission denied", "error");
    }
  };

  const stopScan = () => {
    setScanning(false);
    if (scanFrameRef.current) cancelAnimationFrame(scanFrameRef.current);
    if (videoRef.current?.srcObject) {
      videoRef.current.srcObject.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  const scanFrame = () => {
    const video = videoRef.current;
    const canvas = scanCanvasRef.current;
    if (!video || !canvas || video.readyState < 2) {
      scanFrameRef.current = requestAnimationFrame(scanFrame);
      return;
    }
    const ctx = canvas.getContext("2d");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height);
    if (code?.data) {
      stopScan();
      try {
        const payload = JSON.parse(code.data);
        const identifier = payload.identifier || payload.email || payload.phone;
        if (!identifier) throw new Error("invalid payload");
        const recipient = {
          name: payload.name || "Scanned User",
          email: identifier,
          phone: identifier,
        };
        addToast(`Scanned ${recipient.name}`, "success");
        navigate("/app/send", { state: { recipient } });
      } catch {
        addToast("Invalid QR payload", "error");
      }
      return;
    }
    scanFrameRef.current = requestAnimationFrame(scanFrame);
  };

  const payLink = `https://finflow.app/pay/${user?._id}?name=${encodeURIComponent(user?.name || "")}`;

  return (
    <div className="animate-fade-in">
      <h1 className="qrpay-title">QR Pay</h1>
      <p className="qrpay-subtitle">
        Scan or share your QR code to receive payments instantly
      </p>

      <div className="qrpay-grid">
        {/* My QR */}
        <Card className="qrpay-qr-card">
          <SectionTitle>Your QR Code</SectionTitle>
          <div className="qrpay-qr-container">
            <canvas ref={canvasRef} width={200} height={200} />
          </div>
          <div className="qrpay-user-name">{user?.name}</div>
          <div className="qrpay-user-phone">{user?.phone}</div>
          <div className="qrpay-qr-buttons">
            <Button variant="primary" size="sm" onClick={downloadQR}>
              ↓ Download
            </Button>
            <Button variant="outline" size="sm" onClick={copyLink}>
              Share Link
            </Button>
          </div>
        </Card>

        <div className="qrpay-scan-section">
          {/* Scan & Pay */}
          <Card className="qrpay-scan-card">
            <SectionTitle>Scan & Pay</SectionTitle>
            <div className="qrpay-scan-description">
              Use your camera to scan a FinFlow QR code.
            </div>
            <div className="qrpay-scan-buttons">
              <Button
                variant="primary"
                size="sm"
                onClick={startScan}
                disabled={scanning}
              >
                Start Camera
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={stopScan}
                disabled={!scanning}
              >
                Stop
              </Button>
              <Button variant="outline" size="sm" onClick={simulateScan}>
                Simulate
              </Button>
            </div>
            <video ref={videoRef} className="qrpay-video" playsInline muted />
            <canvas ref={scanCanvasRef} className="qrpay-scan-canvas" />
          </Card>

          {/* Payment link */}
          <Card className="qrpay-link-card">
            <SectionTitle>Payment Link</SectionTitle>
            <div className="qrpay-link-display">{payLink}</div>
            <Button variant="outline" size="sm" onClick={copyLink}>
              Copy Link
            </Button>
          </Card>

          {/* Tips */}
          <Card className="qrpay-tips-card">
            <SectionTitle>How it works</SectionTitle>
            <div className="qrpay-tips-list">
              {[
                ["1", "Show your QR code to the payer"],
                ["2", "They scan it with FinFlow app"],
                ["3", "Enter amount & confirm payment"],
                ["4", "Money credited instantly!"],
              ].map(([n, text]) => (
                <div key={n} className="qrpay-tip-item">
                  <div className="qrpay-tip-number">{n}</div>
                  <span className="qrpay-tip-text">{text}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
