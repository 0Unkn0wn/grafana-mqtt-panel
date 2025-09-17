<!-- This README file is going to be the one displayed on the Grafana.com website for your plugin. Uncomment and replace the content here before publishing.

Remove any remaining comments before publishing as these may be displayed on Grafana.com -->

# Mqtt-Panel

This panel lets you control and monitor values via MQTT over WebSockets directly from Grafana.

- Modes: `Text`, `Slider`, `Switch`, `Button`
- MQTT: connect to `ws://` or `wss://`, subscribe to a topic, optionally query JSON payloads via JSONata, and publish to another topic.

Limitations
- Runs in the browser, so only MQTT over WebSockets is supported and the broker must be reachable from the user’s browser.

Quick start
- Set Protocol, Server, Port
- Set Subscribe topic (e.g. `grafana/mqtt-panel`)
- Optional JSONata query to extract a value from JSON messages
- Set Publish topic (e.g. `grafana/mqtt-panel/set`)
- Choose a mode and configure its label and values

Security
- Optional Basic Auth (username/password) for the broker

Note: The panel still exposes the scaffold’s sample options and a small circle element to remain compatible with the default E2E tests.

<!-- To help maximize the impact of your README and improve usability for users, we propose the following loose structure:

**BEFORE YOU BEGIN**
- Ensure all links are absolute URLs so that they will work when the README is displayed within Grafana and Grafana.com
- Be inspired ✨
  - [grafana-polystat-panel](https://github.com/grafana/grafana-polystat-panel)
  - [volkovlabs-variable-panel](https://github.com/volkovlabs/volkovlabs-variable-panel)

**ADD SOME BADGES**

Badges convey useful information at a glance for users whether in the Catalog or viewing the source code. You can use the generator on [Shields.io](https://shields.io/badges/dynamic-json-badge) together with the Grafana.com API
to create dynamic badges that update automatically when you publish a new version to the marketplace.

- For the URL parameter use `https://grafana.com/api/plugins/your-plugin-id`.
- Example queries:
  - Downloads: `$.downloads`
  - Catalog Version: `$.version`
  - Grafana Dependency: `$.grafanaDependency`
  - Signature Type: `$.versionSignatureType`
- Optionally, for the logo parameter use `grafana`.

Full example: ![Dynamic JSON Badge](https://img.shields.io/badge/dynamic/json?logo=grafana&query=$.version&url=https://grafana.com/api/plugins/grafana-polystat-panel&label=Marketplace&prefix=v&color=F47A20)

Consider other [badges](https://shields.io/badges) as you feel appropriate for your project.

## Overview / Introduction
Provide one or more paragraphs as an introduction to your plugin to help users understand why they should use it.

Consider including screenshots:
- in [plugin.json](https://grafana.com/developers/plugin-tools/reference/plugin-json#info) include them as relative links.
- in the README ensure they are absolute URLs.

## Requirements
List any requirements or dependencies they may need to run the plugin.

## Getting Started
Provide a quick start on how to configure and use the plugin.

## Documentation
If your project has dedicated documentation available for users, provide links here. For help in following Grafana's style recommendations for technical documentation, refer to our [Writer's Toolkit](https://grafana.com/docs/writers-toolkit/).

## Contributing
Do you want folks to contribute to the plugin or provide feedback through specific means? If so, tell them how!
-->
