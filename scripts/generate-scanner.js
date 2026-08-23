import { mkdir, readFile, writeFile } from "node:fs/promises";

const username = process.env.GITHUB_USERNAME || "ANSHIKA1220";
const token = process.env.GITHUB_TOKEN;

const output = new URL(
  "../assets/contribution-forensics.svg",
  import.meta.url
);

async function fetchCalendar() {
  if (!token) {
    return mockCalendar();
  }

  const query = `
    query($login: String!) {
      user(login: $login) {
        contributionsCollection {
          contributionCalendar {
            totalContributions
            weeks {
              contributionDays {
                contributionCount
                contributionLevel
                date
                weekday
              }
            }
          }
        }
      }
    }
  `;

  const response = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      Authorization: `bearer ${token}`,
      "Content-Type": "application/json",
      "User-Agent": `${username}-profile-readme`
    },
    body: JSON.stringify({
      query,
      variables: {
        login: username
      }
    })
  });

  if (!response.ok) {
    throw new Error(
      `GitHub GraphQL request failed: ${response.status}`
    );
  }

  const body = await response.json();

  if (body.errors) {
    throw new Error(
      body.errors.map(({ message }) => message).join("; ")
    );
  }

  const calendar =
    body.data.user.contributionsCollection.contributionCalendar;

  return {
    weeks: calendar.weeks,
    total: calendar.totalContributions,
    preview: false
  };
}

/*
 * Generates sample activity only when running locally
 * without a GitHub token.
 */
function mockCalendar() {
  let total = 0;
  const start = new Date("2025-08-24T00:00:00Z");

  const weeks = Array.from({ length: 53 }, (_, week) => ({
    contributionDays: Array.from(
      { length: 7 },
      (_, weekday) => {
        const index = week * 7 + weekday;

        const count =
          index % 17 === 0
            ? 8
            : (week * 3 + weekday) % 11 === 0
              ? 4
              : index % 29 === 0
                ? 2
                : 0;

        const date = new Date(start);
        date.setUTCDate(start.getUTCDate() + index);

        total += count;

        return {
          contributionCount: count,
          contributionLevel:
            count > 6
              ? "FOURTH_QUARTILE"
              : count > 3
                ? "THIRD_QUARTILE"
                : count > 0
                  ? "FIRST_QUARTILE"
                  : "NONE",
          date: date.toISOString().slice(0, 10),
          weekday
        };
      }
    )
  }));

  return {
    weeks,
    total,
    preview: true
  };
}

function contributionLevel(day) {
  if (!day.contributionCount) {
    return 0;
  }

  const levels = {
    FIRST_QUARTILE: 1,
    SECOND_QUARTILE: 2,
    THIRD_QUARTILE: 3,
    FOURTH_QUARTILE: 4
  };

  return levels[day.contributionLevel] || 1;
}

function escapeXml(value) {
  const replacements = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&apos;"
  };

  return String(value).replace(
    /[&<>"']/g,
    character => replacements[character]
  );
}

function renderConstellation({
  weeks,
  total,
  preview
}) {
  const width = 800;
  const height = 300;

  const originX = 55;
  const originY = 122;

  const horizontalSpacing = 13;
  const verticalSpacing = 14;

  const nodes = [];
  const months = [];

  let previousMonth = "";

  /*
   * Convert every active contribution day into a node.
   */
  weeks.forEach((week, weekIndex) => {
    week.contributionDays.forEach(day => {
      const intensity = contributionLevel(day);

      const date = new Date(
        `${day.date}T00:00:00Z`
      );

      const month = date.toLocaleString(
        "en-US",
        {
          month: "short",
          timeZone: "UTC"
        }
      );

      /*
       * Add month labels along the bottom.
       */
      if (
        day.weekday === 0 &&
        month !== previousMonth
      ) {
        months.push({
          month,
          x: originX + weekIndex * horizontalSpacing
        });

        previousMonth = month;
      }

      /*
       * Only active contribution days become nodes.
       */
      if (intensity > 0) {
        nodes.push({
          x: originX + weekIndex * horizontalSpacing,
          y: originY + day.weekday * verticalSpacing,
          intensity,
          count: day.contributionCount,
          date: day.date,
          index: weekIndex * 7 + day.weekday
        });
      }
    });
  });

  /*
   * Connect a limited number of nearby nodes.
   * The limit prevents the network from becoming cluttered.
   */
  const connections = [];

  for (
    let i = 0;
    i < nodes.length && connections.length < 28;
    i += 1
  ) {
    for (
      let j = i + 1;
      j < Math.min(nodes.length, i + 8);
      j += 1
    ) {
      const firstNode = nodes[i];
      const secondNode = nodes[j];

      const distance = Math.hypot(
        firstNode.x - secondNode.x,
        firstNode.y - secondNode.y
      );

      if (
        distance >= 15 &&
        distance <= 48 &&
        (firstNode.index + secondNode.index) % 3 === 0
      ) {
        connections.push({
          firstNode,
          secondNode,
          delay: (connections.length % 9) * 0.55
        });

        break;
      }
    }
  }

  /*
   * Generate faint animated connection lines.
   */
  const connectionSvg = connections
    .map(
      (
        {
          firstNode,
          secondNode,
          delay
        },
        index
      ) => `
        <line
          x1="${firstNode.x}"
          y1="${firstNode.y}"
          x2="${secondNode.x}"
          y2="${secondNode.y}"
          class="connection connection-${index % 2}"
        >
          <animate
            attributeName="opacity"
            values=".08;.32;.08"
            dur="5.5s"
            begin="${delay}s"
            repeatCount="indefinite"
          />
        </line>
      `
    )
    .join("");

  /*
   * Generate one circle for every active day.
   */
  const nodeSvg = nodes
    .map(node => {
      const radiusByIntensity = [
        0,
        2.7,
        3.4,
        4.2,
        5.1
      ];

      const radius =
        radiusByIntensity[node.intensity];

      let colour = "#20c9d8";

      if (node.intensity === 3) {
        colour = "#7c8cff";
      }

      if (node.intensity === 4) {
        colour = "#f15ad7";
      }

      const delay = (node.index % 31) / 8;

      return `
        <circle
          cx="${node.x}"
          cy="${node.y}"
          r="${radius}"
          fill="${colour}"
          class="node node-${node.intensity}"
        >
          <title>
            ${escapeXml(node.date)}:
            ${node.count} contributions
          </title>

          <animate
            attributeName="opacity"
            values=".6;1;.72"
            dur="4.2s"
            begin="${delay}s"
            repeatCount="indefinite"
          />
        </circle>
      `;
    })
    .join("");

  /*
   * Generate month names.
   */
  const monthSvg = months
    .map(
      ({ month, x }) => `
        <text
          x="${x}"
          y="235"
          class="month"
        >
          ${month}
        </text>
      `
    )
    .join("");

  const contributionText = preview
    ? "Preview data"
    : `${total} contributions`;

  return `
<svg
  xmlns="http://www.w3.org/2000/svg"
  width="${width}"
  height="${height}"
  viewBox="0 0 ${width} ${height}"
  role="img"
  aria-labelledby="title description"
>
  <title id="title">
    ${escapeXml(username)} - My year in code
  </title>

  <desc id="description">
    A neural constellation generated from
    ${total} GitHub contributions.
  </desc>

  <defs>
    <linearGradient
      id="background"
      x1="0"
      x2="1"
    >
      <stop stop-color="#080d15" />
      <stop
        offset="1"
        stop-color="#110817"
      />
    </linearGradient>

    <linearGradient
      id="accent"
      x1="0"
      x2="1"
    >
      <stop stop-color="#20c9d8" />
      <stop
        offset="1"
        stop-color="#f15ad7"
      />
    </linearGradient>

    <filter
      id="glow"
      x="-100%"
      y="-100%"
      width="300%"
      height="300%"
    >
      <feGaussianBlur
        stdDeviation="2.8"
        result="blur"
      />

      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>

    <style>
      text {
        font-family:
          -apple-system,
          BlinkMacSystemFont,
          "Segoe UI",
          Helvetica,
          Arial,
          sans-serif;
      }

      .heading {
        font-size: 18px;
        font-weight: 650;
        fill: #f0f6fc;
      }

      .subtitle {
        font-size: 12px;
        fill: #8b949e;
      }

      .username {
        font-size: 13px;
        fill: #c9d1d9;
      }

      .month {
        font-size: 10px;
        fill: #687482;
      }

      .connection {
        stroke-width: 1;
        opacity: .15;
      }

      .connection-0 {
        stroke: #20c9d8;
      }

      .connection-1 {
        stroke: #f15ad7;
      }

      .node {
        stroke: #d8fbff;
        stroke-opacity: .18;
      }

      .node-3,
      .node-4 {
        filter: url(#glow);
      }

      @media (prefers-reduced-motion: reduce) {
        animate {
          display: none;
        }
      }
    </style>
  </defs>

  <rect
    x="1"
    y="1"
    width="798"
    height="298"
    rx="14"
    fill="url(#background)"
    stroke="#30363d"
  />

  <text
    x="34"
    y="43"
    class="heading"
  >
    MY YEAR IN CODE
  </text>

  <text
    x="34"
    y="67"
    class="subtitle"
  >
    ${contributionText} · updated daily
  </text>

  <text
    x="766"
    y="43"
    text-anchor="end"
    class="username"
  >
    ${escapeXml(username)}
  </text>

  <path
    d="M34 88H766"
    stroke="#242c38"
  />

  <path
    d="M34 88H190"
    stroke="url(#accent)"
    stroke-width="2"
  />

  <g>
    ${connectionSvg}
  </g>

  <g>
    ${nodeSvg}
  </g>

  <g>
    ${monthSvg}
  </g>

  <text
    x="34"
    y="274"
    class="subtitle"
  >
    Each node is an active day.
    Brighter nodes mean more contributions.
  </text>

  <circle
    cx="681"
    cy="271"
    r="3"
    fill="#20c9d8"
  />

  <text
    x="691"
    y="275"
    class="month"
  >
    active
  </text>

  <circle
    cx="733"
    cy="271"
    r="4"
    fill="#f15ad7"
    filter="url(#glow)"
  />

  <text
    x="743"
    y="275"
    class="month"
  >
    high
  </text>
</svg>
  `.trim();
}

const data = await fetchCalendar();

await mkdir(
  new URL("../assets/", import.meta.url),
  {
    recursive: true
  }
);

await writeFile(
  output,
  renderConstellation(data),
  "utf8"
);

/*
 * Change the README image URL after every workflow run.
 * This prevents GitHub from showing an older cached SVG.
 */
if (token) {
  const readmePath = new URL(
    "../README.md",
    import.meta.url
  );

  const readme = await readFile(
    readmePath,
    "utf8"
  );

  const refreshedReadme = readme.replace(
    /contribution-forensics\.svg(?:\?v=[^"]*)?/g,
    `contribution-forensics.svg?v=${Date.now()}`
  );

  await writeFile(
    readmePath,
    refreshedReadme,
    "utf8"
  );
}

console.log(
  `Generated neural contribution constellation for ${username} (${data.total} contributions).`
);
