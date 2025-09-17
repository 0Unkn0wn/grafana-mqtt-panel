type SeriesSize = 'sm' | 'md' | 'lg';

export type ControlMode = 'Text' | 'Slider' | 'Switch' | 'Button';
export type AuthMode = 'None' | 'BasicAuth';

export interface MqttOptions {
  mqttProtocol: 'ws' | 'wss';
  mqttServer: string;
  mqttServerPort: number;
  mqttWebsocketPath: string;
  mqttTopicSubscribe: string;
  mqttTopicPublish: string;
  mqttTopicQuery: string; // JSONata expression
  mqttAuth: AuthMode;
  mqttUser?: string;
  mqttPassword?: string;
  receiveOnly: boolean;
}

export interface SimpleOptions extends MqttOptions {
  text: string;
  showSeriesCount: boolean;
  seriesCountSize: SeriesSize;
  mode: ControlMode;
  model: {
    text: string;
    minValue: number;
    maxValue: number;
    step: number;
    offValue: string;
    onValue: string;
  };
}
