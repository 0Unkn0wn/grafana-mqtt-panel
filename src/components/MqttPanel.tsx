import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PanelProps } from '@grafana/data';
import { SimpleOptions } from 'types';
import { css, cx } from '@emotion/css';
import { useStyles2, Button, InlineField, InlineFieldRow, Input, Slider, Switch, Badge } from '@grafana/ui';
import { PanelDataErrorView } from '@grafana/runtime';
// Avoid Node typings requirement in TS tools
declare const require: any;
// Types are `any` because we load the browser bundle of mqtt
type IClientOptions = any;
type MqttClient = any;
// Use browser build to avoid Node polyfills
const mqtt: any = require('mqtt/dist/mqtt.min.js');
const jsonata: any = require('jsonata');

interface Props extends PanelProps<SimpleOptions> {}

const getStyles = () => ({
  wrapper: css`
    font-family: Open Sans;
    position: relative;
  `,
});

export const MqttPanel: React.FC<Props> = ({ options, data, fieldConfig, id, width, height }) => {
  const styles = useStyles2(getStyles);

  const [connected, setConnected] = useState(false);
  const [firstReceived, setFirstReceived] = useState(false);
  const [value, setValue] = useState<any>('');
  const [lastError, setLastError] = useState<string | null>(null);
  const [lastSent, setLastSent] = useState<string | null>(null);
  const [lastReceived, setLastReceived] = useState<string | null>(null);
  const [echoed, setEchoed] = useState<boolean>(false);
  const clientRef = useRef<MqttClient | null>(null);
  const lastSentRef = useRef<string | null>(null);

  const subscribeTopic = options.mqttTopicSubscribe?.trim();
  const publishTopic = options.mqttTopicPublish?.trim();
  const queryExpr = options.mqttTopicQuery?.trim();

  const connectClient = useCallback(() => {
    try {
  const path = (options.mqttWebsocketPath || '').trim();
  const normalizedPath = path ? (path.startsWith('/') ? path : `/${path}`) : '';
  const url = `${options.mqttProtocol}://${options.mqttServer}:${options.mqttServerPort}${normalizedPath}`;
      const opts: IClientOptions = {};
      if (options.mqttAuth === 'BasicAuth' && options.mqttUser) {
        opts.username = options.mqttUser;
        if (options.mqttPassword) {
          opts.password = options.mqttPassword;
        }
      }
      const c = mqtt.connect(url, opts);
      c.on('connect', () => {
        setConnected(true);
        setLastError(null);
      });
      c.on('reconnect', () => setConnected(false));
      c.on('close', () => setConnected(false));
      c.on('error', (err: any) => {
        setConnected(false);
        try {
          setLastError(String(err?.message || err) || 'Connection error');
        } catch {
          setLastError('Connection error');
        }
      });
      c.on('message', (topic: string, payload: any) => {
        setFirstReceived(true);
        const raw = payload?.toString?.() ?? String(payload);
        let message: any = raw;
        if (queryExpr) {
          try {
            const obj = JSON.parse(message);
            const expr = jsonata(queryExpr);
            const res = expr.evaluate(obj);
            message = res ?? '';
          } catch {}
        }
        setLastReceived(String(message));
        if (topic && publishTopic && topic === publishTopic) {
          setEchoed(lastSentRef.current != null && raw === lastSentRef.current);
        }
        switch (options.mode) {
          case 'Switch': {
            const onVal = String(options.model.onValue);
            setValue(String(message) === onVal);
            break;
          }
          case 'Text':
          case 'Slider': {
            setValue(message);
            break;
          }
          case 'Button':
            break;
        }
      });
      if (subscribeTopic) {
        c.subscribe(subscribeTopic);
      }
      clientRef.current = c;
    } catch (e: any) {
      setConnected(false);
      try {
        setLastError(String(e?.message || e));
      } catch {
        setLastError('Connection init error');
      }
    }
  }, [options, subscribeTopic, queryExpr, publishTopic]);

  useEffect(() => {
    lastSentRef.current = lastSent;
  }, [lastSent]);

  useEffect(() => {
    connectClient();
    return () => {
      if (clientRef.current) {
        try {
          clientRef.current.end(true);
        } catch {}
        clientRef.current = null;
      }
      setConnected(false);
      setFirstReceived(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    options.mqttProtocol,
    options.mqttServer,
    options.mqttServerPort,
    options.mqttWebsocketPath,
    options.mqttAuth,
    options.mqttUser,
    options.mqttPassword,
    options.mqttTopicSubscribe,
    options.mqttTopicQuery,
  ]);

  const publish = useCallback(
    (out: any) => {
      if (!clientRef.current || !connected) {
        return;
      }
      if (!publishTopic) {
        return;
      }
      if (options.receiveOnly) {
        return;
      }
      if (!firstReceived) {
        setFirstReceived(true);
        return;
      }
      try {
        const outStr = String(out);
        setLastSent(outStr);
        setEchoed(false);
        clientRef.current.publish(publishTopic, outStr);
      } catch {}
    },
    [connected, publishTopic, firstReceived, options.receiveOnly]
  );

  const control = useMemo(() => {
    switch (options.mode) {
      case 'Text':
        return (
          <InlineFieldRow>
            <InlineField label="Value">
              <Input width={30} value={value ?? ''} onChange={(e) => setValue(e.currentTarget.value)} />
            </InlineField>
            <Button onClick={() => publish(value)}>{options.model.text || options.text || 'Send'}</Button>
          </InlineFieldRow>
        );
      case 'Slider':
        return (
          <InlineFieldRow>
            <InlineField label={`${options.model.text || 'Value'}: ${value ?? ''}`} grow>
              <Slider
                min={Number(options.model.minValue) ?? 0}
                max={Number(options.model.maxValue) ?? 100}
                step={Number(options.model.step) ?? 1}
                value={Number(value ?? options.model.minValue ?? 0)}
                onChange={(v) => {
                  setValue(v);
                  publish(v);
                }}
              />
            </InlineField>
          </InlineFieldRow>
        );
      case 'Switch':
        return (
          <InlineFieldRow>
            <InlineField label={options.model.text || options.text || 'Toggle'}>
              <Switch
                value={Boolean(value)}
                onChange={(e) => {
                  const next = e.currentTarget.checked;
                  setValue(next);
                  const out = next ? options.model.onValue : options.model.offValue;
                  publish(out);
                }}
              />
            </InlineField>
          </InlineFieldRow>
        );
      case 'Button':
      default:
        return <Button onClick={() => publish(value)}>{options.model.text || options.text || 'Send'}</Button>;
    }
  }, [options, publish, value]);

  if (data.series.length === 0) {
    return <PanelDataErrorView fieldConfig={fieldConfig} panelId={id} data={data} needsStringField />;
  }

  return (
    <div
      className={cx(
        styles.wrapper,
        css`
          width: ${width}px;
          height: ${height}px;
          padding: 8px;
        `
      )}
    >
      <div
        className={css`
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
        `}
      >
        <Badge color={connected ? 'green' : 'red'} text={connected ? 'Connected' : 'Disconnected'} />
        {lastError && (
          <span
            className={css`
              color: #b54; opacity: 0.8;
            `}
            title={lastError}
          >
            {lastError}
          </span>
        )}
        {subscribeTopic && <span className={css`opacity:0.7;`}>Sub: {subscribeTopic}</span>}
        {publishTopic && <span className={css`opacity:0.7;`}>Pub: {publishTopic}</span>}
        {lastSent !== null && (
          <span className={css`opacity:0.8;`}>
            Sent: {lastSent.length > 60 ? `${lastSent.slice(0, 60)}…` : lastSent}
          </span>
        )}
        {lastReceived !== null && (
          <span className={css`opacity:0.8;`}>
            Recv: {lastReceived.length > 60 ? `${lastReceived.slice(0, 60)}…` : lastReceived} {echoed && '✓'}
          </span>
        )}
      </div>
      {control}
    </div>
  );
};
