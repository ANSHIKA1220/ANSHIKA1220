import { mkdir, writeFile } from "node:fs/promises";

const username = process.env.GITHUB_USERNAME || "ANSHIKA1220";
const token = process.env.GITHUB_TOKEN;
const output = new URL("../assets/contribution-forensics.svg", import.meta.url);

async function fetchWeeks() {
  if (!token) return mockWeeks();

  const query = `query($login: String!) {
    user(login: $login) {
      contributionsCollection {
        contributionCalendar {
          totalContributions
          weeks {
            contributionDays { contributionCount contributionLevel date weekday }
          }
        }
      }
    }
  }`;

  const response = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      Authorization: `bearer ${token}`,
      "Content-Type": "application/json",
      "User-Agent": `${username}-profile-readme`
    },
    body: JSON.stringify({ query, variables: { login: username } })
  });

  if (!response.ok) throw new Error(`GitHub GraphQL request failed: ${response.status}`);
  const body = await response.json();
  if (body.errors) throw new Error(body.errors.map(({ message }) => message).join("; "));
  const calendar = body.data.user.contributionsCollection.contributionCalendar;
  return { weeks: calendar.weeks, total: calendar.totalContributions };
}

function mockWeeks() {
  let total = 0;
  const weeks = Array.from({ length: 53 }, (_, week) => ({
    contributionDays: Array.from({ length: 7 }, (_, weekday) => {
      const count = (week * 7 + weekday * 11) % 13 === 0 ? 7 : (week + weekday) % 9 === 0 ? 3 : 0;
      total += count;
      return { contributionCount: count, contributionLevel: count > 5 ? "FOURTH_QUARTILE" : count ? "SECOND_QUARTILE" : "NONE", date: "preview", weekday };
    })
  }));
  return { weeks, total };
}

function level(day) {
  if (!day.contributionCount) return 0;
  return { FIRST_QUARTILE: 1, SECOND_QUARTILE: 2, THIRD_QUARTILE: 3, FOURTH_QUARTILE: 4 }[day.contributionLevel] || 1;
}

function escapeXml(value) {
  return String(value).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" }[c]));
}

function render({ weeks, total }) {
  const size = 10;
  const gap = 3;
  const originX = 52;
  const originY = 115;
  const cells = weeks.flatMap((week, x) => week.contributionDays.map(day => {
    const intensity = level(day);
    const fill = ["#111827", "#063f4b", "#087e8b", "#00d9ff", "#ff2bd6"][intensity];
    const delay = ((x * 7 + day.weekday) % 37) / 10;
    return `<rect class="cell l${intensity}" x="${originX + x * (size + gap)}" y="${originY + day.weekday * (size + gap)}" width="${size}" height="${size}" rx="2" fill="${fill}"><title>${escapeXml(day.date)}: ${day.contributionCount} contributions</title><animate attributeName="opacity" values=".55;1;.72" dur="3.8s" begin="${delay}s" repeatCount="indefinite"/></rect>`;
  })).join("\n");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="275" viewBox="0 0 800 275" role="img" aria-labelledby="title desc">
  <title id="title">${escapeXml(username)} signal forensics contribution scan</title>
  <desc id="desc">An animated cyberpunk scanner generated from ${total} GitHub contributions.</desc>
  <defs>
    <linearGradient id="panel" x1="0" x2="1"><stop stop-color="#050914"/><stop offset="1" stop-color="#10061a"/></linearGradient>
    <linearGradient id="scan" x1="0" x2="1"><stop stop-color="#00d9ff" stop-opacity="0"/><stop offset=".48" stop-color="#00d9ff"/><stop offset=".52" stop-color="#ff2bd6"/><stop offset="1" stop-color="#ff2bd6" stop-opacity="0"/></linearGradient>
    <filter id="glow"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <style>
      text{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}.label{fill:#8b9bb4;font-size:11px;letter-spacing:1.8px}.value{fill:#e8fbff;font-size:14px}.cyan{fill:#00d9ff}.magenta{fill:#ff2bd6}.cell{stroke:#1d2940;stroke-width:.5}.l4{filter:url(#glow)}
      @media(prefers-reduced-motion:reduce){animate{display:none}.scanline{display:none}}
    </style>
  </defs>
  <rect x="1" y="1" width="798" height="273" rx="14" fill="url(#panel)" stroke="#25344d"/>
  <path d="M20 55H780M20 235H780" stroke="#1c2a43"/>
  <text x="28" y="31" class="label cyan">CASE // CONTRIBUTION TELEMETRY</text>
  <circle cx="744" cy="27" r="4" fill="#ff2bd6"><animate attributeName="opacity" values="1;.15;1" dur="1.4s" repeatCount="indefinite"/></circle>
  <text x="756" y="31" class="label magenta">LIVE</text>
  <text x="28" y="79" class="label">SUBJECT</text><text x="108" y="79" class="value">${escapeXml(username)}</text>
  <text x="360" y="79" class="label">SIGNALS VERIFIED</text><text x="515" y="79" class="value cyan">${total}</text>
  <text x="647" y="79" class="label">STATUS</text><text x="708" y="79" class="value magenta">ACTIVE</text>
  <g>${cells}</g>
  <rect class="scanline" x="42" y="105" width="70" height="108" fill="url(#scan)" opacity=".55" filter="url(#glow)">
    <animate attributeName="x" values="42;725;42" dur="9s" repeatCount="indefinite"/>
  </rect>
  <text x="28" y="258" class="label">MULTIMODAL TRACE: </text><text x="174" y="258" class="label cyan">AUTHENTIC ACTIVITY DETECTED</text>
  <text x="628" y="258" class="label magenta">SCAN COMPLETE</text>
</svg>`;
}

const data = await fetchWeeks();
await mkdir(new URL("../assets/", import.meta.url), { recursive: true });
await writeFile(output, render(data), "utf8");
console.log(`Generated contribution-forensics.svg for ${username} (${data.total} contributions).`);
