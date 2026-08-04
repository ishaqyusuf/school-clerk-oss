const operationRows = [
  ["Admissions", "Ready for review", "#68C79B"],
  ["Attendance", "School day synced", "#D9A533"],
  ["Payments", "Records reconciled", "#8ED9B7"],
] as const;

export function SocialPreviewImage() {
  return (
    <div
      style={{
        alignItems: "stretch",
        background: "#0E1D18",
        color: "#FFFFFF",
        display: "flex",
        fontFamily: "Arial, Helvetica, sans-serif",
        height: "100%",
        overflow: "hidden",
        padding: 58,
        position: "relative",
        width: "100%",
      }}
    >
      <div
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.055) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.055) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
          display: "flex",
          inset: 0,
          position: "absolute",
        }}
      />
      <div
        style={{
          background: "rgba(104, 199, 155, 0.16)",
          borderRadius: 999,
          display: "flex",
          height: 460,
          position: "absolute",
          right: -150,
          top: -210,
          width: 460,
        }}
      />

      <div
        style={{
          display: "flex",
          gap: 54,
          position: "relative",
          width: "100%",
        }}
      >
        <div
          style={{
            display: "flex",
            flex: "1 1 0",
            flexDirection: "column",
            justifyContent: "space-between",
            minWidth: 0,
          }}
        >
          <div style={{ alignItems: "center", display: "flex", gap: 16 }}>
            <div
              style={{
                alignItems: "center",
                background: "#0F172A",
                border: "2px solid rgba(255,255,255,0.14)",
                borderRadius: 18,
                display: "flex",
                height: 70,
                justifyContent: "center",
                position: "relative",
                width: 70,
              }}
            >
              <div
                style={{
                  background: "#F8FAFC",
                  borderRadius: 5,
                  display: "flex",
                  height: 17,
                  left: 15,
                  position: "absolute",
                  top: 15,
                  width: 17,
                }}
              />
              <div
                style={{
                  background: "#38BDF8",
                  borderRadius: 5,
                  display: "flex",
                  height: 17,
                  position: "absolute",
                  right: 15,
                  top: 15,
                  width: 17,
                }}
              />
              <div
                style={{
                  background: "#14B8A6",
                  borderRadius: 5,
                  bottom: 15,
                  display: "flex",
                  height: 17,
                  left: 15,
                  position: "absolute",
                  width: 17,
                }}
              />
              <div
                style={{
                  background: "#F59E0B",
                  borderRadius: 999,
                  bottom: 13,
                  display: "flex",
                  height: 19,
                  position: "absolute",
                  right: 13,
                  width: 19,
                }}
              />
              <div
                style={{
                  background: "#F8FAFC",
                  display: "flex",
                  height: 7,
                  left: 31,
                  position: "absolute",
                  top: 33,
                  transform: "rotate(45deg)",
                  width: 30,
                }}
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <div style={{ display: "flex", fontSize: 34, fontWeight: 800 }}>
                SchoolClerk
              </div>
              <div
                style={{
                  color: "rgba(255,255,255,0.62)",
                  display: "flex",
                  fontSize: 18,
                  fontWeight: 700,
                }}
              >
                Connected school operations
              </div>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 22,
              maxWidth: 660,
            }}
          >
            <div
              style={{
                color: "#8ED9B7",
                display: "flex",
                fontSize: 23,
                fontWeight: 800,
              }}
            >
              Built for modern school operations
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 70,
                fontWeight: 800,
                letterSpacing: -3,
                lineHeight: 0.96,
              }}
            >
              School operations, finally connected.
            </div>
            <div
              style={{
                color: "rgba(255,255,255,0.7)",
                display: "flex",
                fontSize: 27,
                fontWeight: 600,
                lineHeight: 1.3,
              }}
            >
              Admissions, academics, attendance, payments, results, and family
              communication in one calm system.
            </div>
          </div>

          <div
            style={{
              alignItems: "center",
              display: "flex",
              fontSize: 22,
              fontWeight: 800,
              gap: 12,
            }}
          >
            <div
              style={{
                background: "#68C79B",
                borderRadius: 999,
                display: "flex",
                height: 11,
                width: 11,
              }}
            />
            school-clerk.com
          </div>
        </div>

        <div
          style={{
            alignSelf: "center",
            background: "#FAF8F2",
            border: "2px solid rgba(255,255,255,0.14)",
            borderRadius: 28,
            boxShadow: "0 32px 80px rgba(0,0,0,0.34)",
            color: "#102820",
            display: "flex",
            flex: "0 0 390px",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              alignItems: "center",
              background: "#146B4A",
              color: "#FFFFFF",
              display: "flex",
              justifyContent: "space-between",
              padding: "23px 25px",
            }}
          >
            <div style={{ display: "flex", fontSize: 18, fontWeight: 800 }}>
              Today at a glance
            </div>
            <div
              style={{
                background: "rgba(255,255,255,0.14)",
                borderRadius: 999,
                display: "flex",
                fontSize: 13,
                fontWeight: 800,
                padding: "7px 11px",
              }}
            >
              LIVE
            </div>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 15,
              padding: 24,
            }}
          >
            {operationRows.map(([label, detail, accent]) => (
              <div
                key={label}
                style={{
                  background: "#FFFFFF",
                  border: "1px solid rgba(16,40,32,0.1)",
                  borderRadius: 17,
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                  padding: 18,
                }}
              >
                <div
                  style={{
                    alignItems: "center",
                    display: "flex",
                    justifyContent: "space-between",
                  }}
                >
                  <div
                    style={{ display: "flex", fontSize: 17, fontWeight: 800 }}
                  >
                    {label}
                  </div>
                  <div
                    style={{
                      background: accent,
                      borderRadius: 999,
                      display: "flex",
                      height: 10,
                      width: 10,
                    }}
                  />
                </div>
                <div
                  style={{
                    color: "#617069",
                    display: "flex",
                    fontSize: 15,
                    fontWeight: 700,
                  }}
                >
                  {detail}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
