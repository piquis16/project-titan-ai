
const TITAN_LEAGUES = [
  ["England Premier League", "eng.1"],
  ["Spain La Liga", "esp.1"],
  ["Germany Bundesliga", "ger.1"],
  ["Italy Serie A", "ita.1"],
  ["France Ligue 1", "fra.1"],
  ["Netherlands Eredivisie", "ned.1"],
  ["Portugal Liga Portugal", "por.1"],
  ["Scotland Premiership", "sco.1"],
  ["USA MLS", "usa.1"],
  ["Brazil Serie A", "bra.1"],
  ["Argentina Primera", "arg.1"],
  ["Mexico Liga MX", "mex.1"],
  ["UEFA Champions League", "uefa.champions"],
  ["UEFA Europa League", "uefa.europa"]
];

const TITAN_FIXTURE_KEY = "titan_global_fixtures_v1";

function titanBuildCollector() {
  if (document.getElementById("titanCollector")) return;

  const panel = document.createElement("section");
  panel.id = "titanCollector";
  panel.className = "card";

  panel.innerHTML = `
    <h2>🌍 Global Fixture Collector</h2>
    <p class="muted">Live fixture discovery across supported competitions.</p>
    <button id="titanCollectButton" class="full">
      COLLECT REAL FIXTURES
    </button>
    <p id="titanCollectStatus" class="muted">
      Waiting for collection.
    </p>
    <div id="titanGlobalResults"></div>
  `;

  document.body.appendChild(panel);

  document.getElementById("titanCollectButton")
    .addEventListener("click", titanCollectFixtures);
}

async function titanCollectFixtures() {
  const button = document.getElementById("titanCollectButton");
  const status = document.getElementById("titanCollectStatus");
  const results = document.getElementById("titanGlobalResults");

  button.disabled = true;
  status.textContent = "Connecting to football data sources...";
  results.replaceChildren();

  const start = new Date();
  const end = new Date();
  end.setDate(end.getDate() + 7);

  const dateFormat = date =>
    date.toISOString().slice(0, 10).replaceAll("-", "");

  const dates = dateFormat(start) + "-" + dateFormat(end);
  const collected = [];
  const failed = [];

  for (const [league, code] of TITAN_LEAGUES) {
    status.textContent =
      "Investigating " + league + "...";

    const url =
      "https://site.api.espn.com/apis/site/v2/sports/soccer/" +
      code + "/scoreboard?dates=" + dates;

    try {
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error("HTTP " + response.status);
      }

      const data = await response.json();

      for (const event of (data.events || [])) {
        const competition = event.competitions?.[0];
        const teams = competition?.competitors || [];

        const home = teams.find(t => t.homeAway === "home");
        const away = teams.find(t => t.homeAway === "away");

        if (!home || !away) continue;

        collected.push({
          id: event.id,
          home: home.team.displayName,
          away: away.team.displayName,
          league,
          date: event.date,
          status: competition.status?.type?.description || "Scheduled",
          source: "ESPN",
          collectedAt: new Date().toISOString()
        });
      }
    } catch (error) {
      failed.push(league + ": " + error.message);
    }
  }

  const unique = new Map();

  collected.forEach(fixture => {
    unique.set(fixture.id, fixture);
  });

  const fixtures = Array.from(unique.values());

  localStorage.setItem(
    TITAN_FIXTURE_KEY,
    JSON.stringify(fixtures)
  );

  status.textContent =
    "Collection finished: " + fixtures.length +
    " fixtures found across " +
    (TITAN_LEAGUES.length - failed.length) +
    " successful competitions.";

  fixtures.forEach(fixture => {
    const item = document.createElement("div");
    item.className = "fixture";

    const title = document.createElement("b");
    title.textContent =
      fixture.home + " vs " + fixture.away;

    const info = document.createElement("div");
    info.className = "muted";
    info.textContent =
      fixture.league + " • " +
      new Date(fixture.date).toLocaleString();

    item.append(title, info);
    results.appendChild(item);
  });

  if (failed.length) {
    const warning = document.createElement("p");
    warning.className = "muted";
    warning.textContent =
      failed.length + " competitions could not be reached: " +
      failed.join("; ");
    results.appendChild(warning);
  }
if (!fixtures.length) {
  const msg = document.createElement("p");
  msg.className = "muted";
  msg.textContent =
    "No fixtures retrieved. Details: " +
    (failed.length
      ? failed.join(" | ")
      : "Sources returned no scheduled events.");
  results.appendChild(msg);
}
  
