import json
import os
import streamlit as st

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

STATE_FILE = os.path.join(BASE_DIR, "state.json")
COMMAND_FILE = os.path.join(BASE_DIR, "commands.json")

st.set_page_config(
    page_title="Drone Swarm Command Center",
    page_icon="🚁",
    layout="wide",
    initial_sidebar_state="collapsed"
)

st.markdown(
    """
    <style>
    .stApp {
        background-color: #0e1624;
    }

    .block-container {
        padding-top: 2rem;
        padding-bottom: 2rem;
    }

    .main-title {
        font-size: 2.4rem;
        font-weight: 700;
        margin-bottom: 0.2rem;
    }

    .subtitle {
        color: #9ca8b8;
        font-size: 1rem;
        margin-bottom: 1.5rem;
    }

    .section-title {
        font-size: 1.25rem;
        font-weight: 600;
        margin-top: 1rem;
        margin-bottom: 0.8rem;
    }

    .metric-card {
        background-color: #182235;
        border: 1px solid #29374d;
        border-radius: 12px;
        padding: 18px;
        min-height: 105px;
    }

    .metric-label {
        color: #9ca8b8;
        font-size: 0.85rem;
        margin-bottom: 7px;
    }

    .metric-value {
        font-size: 1.65rem;
        font-weight: 700;
    }

    .drone-card {
        background-color: #182235;
        border: 1px solid #29374d;
        border-radius: 12px;
        padding: 15px;
        margin-bottom: 8px;
    }

    .drone-name {
        font-size: 1.1rem;
        font-weight: 700;
    }

    .drone-status {
        color: #b8c2d1;
        font-size: 0.9rem;
        margin-top: 5px;
    }

    .event-box {
        background-color: #182235;
        border: 1px solid #29374d;
        border-radius: 12px;
        padding: 15px;
    }

    .connected {
        color: #55d68a;
        font-weight: 600;
    }

    .disconnected {
        color: #f06b6b;
        font-weight: 600;
    }

    div.stButton > button {
        width: 100%;
        min-height: 45px;
        border-radius: 8px;
        font-weight: 600;
    }

    hr {
        border-color: #29374d;
    }
    </style>
    """,
    unsafe_allow_html=True
)


def send_command(command):
    try:
        with open(COMMAND_FILE, "w", encoding="utf-8") as file:
            json.dump(
                {"command": command},
                file,
                indent=4
            )

        st.success("Command sent: " + command)

    except Exception as error:
        st.error("ERROR: " + str(error))


def read_json_file(path):
    try:
        with open(path, "r", encoding="utf-8") as file:
            return json.load(file)
    except (FileNotFoundError, json.JSONDecodeError, OSError):
        return None


def status_symbol(status):
    status = str(status).upper()

    if status in ("ACTIVE", "SEARCHING", "INVESTIGATING"):
        return "🟢"

    if status in ("FAILED", "LOW_BATTERY"):
        return "🔴"

    if status in ("PAUSED", "RETURNING"):
        return "🟡"

    if status in ("COMPLETED", "COMPLETE"):
        return "🔵"

    return "⚪"


state_data = read_json_file(STATE_FILE)
command_data = read_json_file(COMMAND_FILE)


st.markdown(
    '<div class="main-title">🚁 Drone Swarm Command Center</div>',
    unsafe_allow_html=True
)

st.markdown(
    '<div class="subtitle">Search & Rescue Mission Control Dashboard</div>',
    unsafe_allow_html=True
)


if state_data is not None:
    st.markdown(
        '<span class="connected">● Simulation Connected</span>',
        unsafe_allow_html=True
    )
else:
    st.markdown(
        '<span class="disconnected">● Simulation Offline</span>',
        unsafe_allow_html=True
    )


st.divider()

st.markdown(
    '<div class="section-title">Mission Overview</div>',
    unsafe_allow_html=True
)


if state_data is not None:
    mission_status = state_data.get("mission_status", "UNKNOWN")
    area_covered = state_data.get("area_covered", 0)
    targets_found = state_data.get("targets_found", 0)
    targets_total = state_data.get("targets_total", 0)
    mission_time = state_data.get("mission_time", 0)
else:
    mission_status = "OFFLINE"
    area_covered = 0
    targets_found = 0
    targets_total = 0
    mission_time = 0


metric1, metric2, metric3, metric4 = st.columns(4)


with metric1:
    st.markdown(
        f"""
        <div class="metric-card">
            <div class="metric-label">MISSION STATUS</div>
            <div class="metric-value">
                {status_symbol(mission_status)} {mission_status}
            </div>
        </div>
        """,
        unsafe_allow_html=True
    )


with metric2:
    st.markdown(
        f"""
        <div class="metric-card">
            <div class="metric-label">AREA COVERED</div>
            <div class="metric-value">
                {area_covered}%
            </div>
        </div>
        """,
        unsafe_allow_html=True
    )


with metric3:
    st.markdown(
        f"""
        <div class="metric-card">
            <div class="metric-label">TARGETS</div>
            <div class="metric-value">
                🎯 {targets_found}/{targets_total}
            </div>
        </div>
        """,
        unsafe_allow_html=True
    )


with metric4:
    st.markdown(
        f"""
        <div class="metric-card">
            <div class="metric-label">MISSION TIME</div>
            <div class="metric-value">
                ⏱️ {mission_time}s
            </div>
        </div>
        """,
        unsafe_allow_html=True
    )


st.write("")

st.markdown(
    '<div class="section-title">Mission Controls</div>',
    unsafe_allow_html=True
)


control1, control2, control3, control4, control5 = st.columns(5)


with control1:
    if st.button("▶ START", use_container_width=True):
        send_command("START")

with control2:
    if st.button("⏸ PAUSE", use_container_width=True):
        send_command("PAUSE")

with control3:
    if st.button("▶ RESUME", use_container_width=True):
        send_command("RESUME")

with control4:
    if st.button("⚠ FAIL D2", use_container_width=True):
        send_command("FAIL_D2")

with control5:
    if st.button("↻ RESET", use_container_width=True):
        send_command("RESET")


st.divider()

st.markdown(
    '<div class="section-title">Drone Fleet</div>',
    unsafe_allow_html=True
)


if state_data is not None:

    drones = state_data.get("drones", [])

    if drones:

        drone_columns = st.columns(len(drones))

        for index, drone in enumerate(drones):

            drone_id = drone.get("id", "Unknown")
            drone_status = drone.get("status", "UNKNOWN")
            battery = drone.get("battery", 0)
            task = drone.get("task", "-")
            healthy = drone.get("healthy", True)

            with drone_columns[index]:

                if not healthy:
                    indicator = "🔴"
                elif battery <= 20:
                    indicator = "🟠"
                elif drone_status == "PAUSED":
                    indicator = "🟡"
                elif drone_status == "COMPLETED":
                    indicator = "🔵"
                else:
                    indicator = "🟢"

                st.markdown(
                    f"""
                    <div class="drone-card">
                        <div class="drone-name">
                            {indicator} {drone_id}
                        </div>
                        <div class="drone-status">
                            Status: {drone_status}
                        </div>
                        <div class="drone-status">
                            Battery: {battery}%
                        </div>
                        <div class="drone-status">
                            Task: {task}
                        </div>
                    </div>
                    """,
                    unsafe_allow_html=True
                )

    else:
        st.info("No drone data available.")

else:
    st.info("Start simulation.py to display the drone fleet.")


st.divider()

left_column, right_column = st.columns(2)


with left_column:

    st.markdown(
        '<div class="section-title">Mission Events</div>',
        unsafe_allow_html=True
    )

    events = []

    if state_data is not None:
        events = state_data.get("events", [])

    if events:

        st.markdown(
            '<div class="event-box">',
            unsafe_allow_html=True
        )

        for event in reversed(events):
            st.write("• " + str(event))

        st.markdown(
            '</div>',
            unsafe_allow_html=True
        )

    else:
        st.info("No mission events recorded.")


with right_column:

    st.markdown(
        '<div class="section-title">Detected Targets</div>',
        unsafe_allow_html=True
    )

    targets = []

    if state_data is not None:
        targets = state_data.get("targets", [])

    if targets:

        for target in targets:

            target_id = target.get("id", "Unknown")
            priority = target.get("priority", "UNKNOWN")
            found = target.get("found", False)
            confidence = target.get("confidence", 0)
            assigned_drone = target.get("drone", "-")

            if found:
                target_status = "🟢 FOUND"
            else:
                target_status = "🟡 SEARCHING"

            st.markdown(
                f"""
                **🎯 {target_id}** — {target_status}

                Priority: **{priority}**  
                Confidence: **{confidence}%**  
                Drone: **{assigned_drone}**
                """
            )

            st.divider()

    else:
        st.info("No target information available.")


st.markdown(
    '<div class="section-title">Command Monitor</div>',
    unsafe_allow_html=True
)


if command_data is not None:

    last_command = command_data.get("command", "")

    if last_command:
        st.write(
            "Last command:",
            "**" + str(last_command) + "**"
        )
    else:
        st.write("Last command: No pending command")

else:
    st.write("Command file not available.")


st.divider()


if st.button("🔄 Refresh Dashboard"):
    st.rerun()


st.caption(
    "Drone Swarm Search & Rescue Simulation • "
    "Streamlit Command Center"
)