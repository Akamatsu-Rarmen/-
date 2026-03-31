const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const app = express();

const db = new sqlite3.Database("tickets.db");

// テーブル作成
db.run(`
CREATE TABLE IF NOT EXISTS tickets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slot INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
`);

// API：ランダム振り分け
app.get("/get-ticket", (req, res) => {

  const slots = [9,10,11,12,13,14];

  db.all("SELECT slot, COUNT(*) as count FROM tickets GROUP BY slot", (err, rows) => {

    let counts = {};
    slots.forEach(s => counts[s] = 0);

    rows.forEach(r => {
      counts[r.slot] = r.count;
    });

    const available = slots.filter(s => counts[s] < 3);

    if (available.length === 0) {
      return res.json({
        success: false,
        message: "本日は満員です"
      });
    }

    const chosen = available[Math.floor(Math.random() * available.length)];

    db.run("INSERT INTO tickets (slot) VALUES (?)", [chosen], function(err) {

      res.json({
        success: true,
        slot: `${chosen}時〜${chosen+1}時`,
        group: counts[chosen] + 1
      });

    });
  });
});

// 画面
app.get("/", (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1">

<style>
body {
  margin:0;
  overflow:hidden;
  display:flex;
  justify-content:center;
  align-items:center;
  height:100vh;
  background: radial-gradient(circle at bottom, #0d1b2a, #000);
  font-family:sans-serif;
  color:white;
}

.shooting-star {
  position:absolute;
  width:2px;
  height:80px;
  background: linear-gradient(white, transparent);
  transform: rotate(45deg);
  animation: shoot 2s linear infinite;
}

@keyframes shoot {
  0% { transform: translate(0,0) rotate(45deg); opacity:1; }
  100% { transform: translate(-600px,600px) rotate(45deg); opacity:0; }
}

.ticket {
  position:relative;
  z-index:10;
  background: rgba(255,255,255,0.95);
  color:#222;
  padding:40px;
  border-radius:25px;
  text-align:center;
  box-shadow:0 20px 60px rgba(0,0,0,0.5);
}

.slot { font-size:20px; margin-bottom:10px; }
.group { font-size:16px; margin-bottom:10px; color:#666; }
</style>

</head>

<body>

<div class="shooting-star" style="left:20%; animation-delay:0s;"></div>
<div class="shooting-star" style="left:50%; animation-delay:1s;"></div>
<div class="shooting-star" style="left:80%; animation-delay:2s;"></div>

<div class="ticket">
  <div id="slot"></div>
  <div id="group"></div>
  <div>QRを読み取って割り当て完了</div>
</div>

<script>
async function getTicket() {
  const res = await fetch('/get-ticket');
  const data = await res.json();

  if (!data.success) {
    document.getElementById("slot").innerText = data.message;
    document.getElementById("group").innerText = "";
  } else {
    document.getElementById("slot").innerText = data.slot;
    document.getElementById("group").innerText = data.group + "組目";
  }
}

getTicket();
</script>

</body>
</html>
`);
});

app.listen(3000, () => console.log("started"));
