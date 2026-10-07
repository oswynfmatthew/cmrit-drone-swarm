import streamlit as st
st.set_page_config(page_title="Drone Swarm Test", layout="wide")
st.title("Drone Swarm Dashboard Test")
st.write("This page proves that Streamlit is installed and working.")
c1, c2, c3 = st.columns(3)
c1.metric("Drones", 5)
c2.metric("Coverage", "0%")
c3.metric("Targets", "0/3")
st.subheader("Test controls")
if st.button("Start test"):
 st.success("Dashboard button works.")