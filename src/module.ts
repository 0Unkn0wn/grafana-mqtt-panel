import { PanelPlugin } from '@grafana/data';
import { SimpleOptions } from './types';
import { MqttPanel } from './components/MqttPanel';

export const plugin = new PanelPlugin<SimpleOptions>(MqttPanel).setPanelOptions((builder) => {
  return (
    builder
      // Basic demo options kept for tests
      .addTextInput({
        path: 'text',
        name: 'Simple text option',
        description: 'Description of panel option',
        defaultValue: 'Default value of text input option',
      })
      .addBooleanSwitch({
        path: 'showSeriesCount',
        name: 'Show series counter',
        defaultValue: false,
      })
      .addRadio({
        path: 'seriesCountSize',
        defaultValue: 'sm',
        name: 'Series counter size',
        settings: {
          options: [
            { value: 'sm', label: 'Small' },
            { value: 'md', label: 'Medium' },
            { value: 'lg', label: 'Large' },
          ],
        },
        showIf: (config) => config.showSeriesCount,
      })
      // Control mode
      .addRadio({
        path: 'mode',
        name: 'Control',
        defaultValue: 'Text',
        settings: {
          options: [
            { value: 'Text', label: 'Text' },
            { value: 'Slider', label: 'Slider' },
            { value: 'Switch', label: 'Switch' },
            { value: 'Button', label: 'Button' },
          ],
        },
      })
      // Label/Text for controls
      .addTextInput({
        path: 'model.text',
        name: 'Label',
        defaultValue: 'Send',
      })
      // Slider settings
      .addNumberInput({
        path: 'model.minValue',
        name: 'Min',
        defaultValue: 0,
        showIf: (v) => v.mode === 'Slider',
      })
      .addNumberInput({
        path: 'model.maxValue',
        name: 'Max',
        defaultValue: 100,
        showIf: (v) => v.mode === 'Slider',
      })
      .addNumberInput({
        path: 'model.step',
        name: 'Step',
        defaultValue: 1,
        showIf: (v) => v.mode === 'Slider',
      })
      // Switch settings
      .addTextInput({
        path: 'model.offValue',
        name: 'Off value',
        defaultValue: 'false',
        showIf: (v) => v.mode === 'Switch',
      })
      .addTextInput({
        path: 'model.onValue',
        name: 'On value',
        defaultValue: 'true',
        showIf: (v) => v.mode === 'Switch',
      })

      // MQTT connection
      .addRadio({
        path: 'mqttProtocol',
        name: 'Protocol',
        defaultValue: 'ws',
        settings: {
          options: [
            { value: 'ws', label: 'ws' },
            { value: 'wss', label: 'wss' },
          ],
        },
      })
      .addTextInput({
        path: 'mqttServer',
        name: 'Server',
        defaultValue: 'localhost',
      })
      .addNumberInput({
        path: 'mqttServerPort',
        name: 'Port',
        defaultValue: 9001,
      })
      .addTextInput({
        path: 'mqttTopicSubscribe',
        name: 'Subscribe topic',
        defaultValue: 'grafana/mqtt-panel',
      })
      .addTextInput({
        path: 'mqttTopicQuery',
        name: 'JSONata query (opt)',
        defaultValue: '',
      })
      .addTextInput({
        path: 'mqttTopicPublish',
        name: 'Publish topic',
        defaultValue: 'grafana/mqtt-panel/set',
      })
      .addRadio({
        path: 'mqttAuth',
        name: 'Authentication',
        defaultValue: 'None',
        settings: {
          options: [
            { value: 'None', label: 'None' },
            { value: 'BasicAuth', label: 'Basic Auth' },
          ],
        },
      })
      .addTextInput({
        path: 'mqttUser',
        name: 'User',
        defaultValue: '',
        showIf: (v) => v.mqttAuth === 'BasicAuth',
      })
      .addTextInput({
        path: 'mqttPassword',
        name: 'Password',
        defaultValue: '',
        settings: { useTextarea: false, placeholder: '' },
        showIf: (v) => v.mqttAuth === 'BasicAuth',
      })
      .addBooleanSwitch({
        path: 'receiveOnly',
        name: 'Receive only (disable publish)',
        defaultValue: false,
      })
  );
});
