const Spinner = () => (
  <div style={{
    minHeight: "100vh",
    backgroundColor: "#0a0a0a",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  }}>
    <div style={{
      width: "32px",
      height: "32px",
      border: "3px solid rgba(249,115,22,0.2)",
      borderTop: "3px solid #f97316",
      borderRadius: "50%",
      animation: "spin 0.8s linear infinite",
    }} />
    <style>{`
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
    `}</style>
  </div>
);

export default Spinner;