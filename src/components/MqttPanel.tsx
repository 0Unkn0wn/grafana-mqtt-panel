import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PanelProps } from '@grafana/data';
import { SimpleOptions } from 'types';
import { css, cx } from '@emotion/css';
import { useStyles2, Button, InlineField, InlineFieldRow, Input, Slider, Switch, Badge } from '@grafana/ui';
import { PanelDataErrorView } from '@grafana/runtime';
declare const require: any;
type IClientOptions = any;
type MqttClient = any;
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
  const showMeta = options.showMeta !== false;

  const log = useCallback(
    (kind: string, payload?: any) => {
      if (options.logToConsole) {
        try {
          // eslint-disable-next-line no-console
          console.log('[mqtt-panel]', kind, payload ?? '');
        } catch {}
      }
      if (options.logToNetwork && options.logEndpoint) {
        try {
          const body = JSON.stringify({ t: Date.now(), kind, payload });
          const navAny: any = typeof navigator !== 'undefined' ? (navigator as any) : undefined;
          if (navAny && typeof navAny.sendBeacon === 'function') {
            navAny.sendBeacon(options.logEndpoint, new Blob([body], { type: 'application/json' }));
          } else if (typeof fetch === 'function') {
            fetch(options.logEndpoint, { method: 'POST', headers: { 'content-type': 'application/json' }, body }).catch(() => {});
          }
        } catch {}
      }
    },
    [options.logToConsole, options.logToNetwork, options.logEndpoint]
  );

  const connectClient = useCallback(() => {
    try {
      const path = (options.mqttWebsocketPath || '').trim();
      const normalizedPath = path ? (path.startsWith('/') ? path : `/${path}`) : '';
      const url = `${options.mqttProtocol}://${options.mqttServer}:${options.mqttServerPort}${normalizedPath}`;
      log('connect', { url, subscribeTopic, publishTopic });
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
        log('connected');
      });
      c.on('reconnect', () => {
        setConnected(false);
        log('reconnect');
      });
      c.on('close', () => {
        setConnected(false);
        log('close');
      });
      c.on('error', (err: any) => {
        setConnected(false);
        try {
          setLastError(String(err?.message || err) || 'Connection error');
        } catch {
          setLastError('Connection error');
        }
        log('error', String(err?.message || err));
      });
      c.on('message', (topic: string, payload: any) => {
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
        log('message', { topic, raw, message, echoed: topic === publishTopic && lastSentRef.current != null && raw === lastSentRef.current });
        switch (options.mode) {
          case 'Switch': {
            const onVal = String(options.model.onValue);
            setValue(String(message) === onVal);
            break;
          }
          case 'Slider': {
            setValue(message);
            break;
          }
          case 'Text':
          case 'Button':
          default:
            // Do not overwrite the Text input or Button value on incoming messages
            break;
        }
      });
      if (subscribeTopic) {
        c.subscribe(subscribeTopic, (err?: any) => {
          if (err) {
            log('subscribe_error', { topic: subscribeTopic, err: String(err?.message || err) });
          } else {
            log('subscribed', { topic: subscribeTopic });
          }
        });
      }
      clientRef.current = c;
    } catch (e: any) {
      setConnected(false);
      try {
        setLastError(String(e?.message || e));
      } catch {
        setLastError('Connection init error');
      }
      log('connect_init_error', String(e?.message || e));
    }
  }, [options, subscribeTopic, queryExpr, publishTopic, log]);

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
      try {
        const outStr = String(out);
        setLastSent(outStr);
        setEchoed(false);
        clientRef.current.publish(publishTopic, outStr);
        log('publish', { topic: publishTopic, payload: outStr });
      } catch {}
    },
    [connected, publishTopic, options.receiveOnly, log]
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
        {showMeta && subscribeTopic && <span className={css`opacity:0.7;`}>Sub: {subscribeTopic}</span>}
        {showMeta && publishTopic && <span className={css`opacity:0.7;`}>Pub: {publishTopic}</span>}
      </div>
      {control}
      {showMeta && (
        <div
          className={css`
            display: flex;
            flex-direction: column;
            gap: 4px;
            margin-top: 8px;
          `}
        >
          <div className={css`opacity:0.8;`}>
            <strong>Sent:</strong> {lastSent != null ? (lastSent.length > 120 ? `${lastSent.slice(0, 120)}…` : lastSent) : '—'}
          </div>
          <div className={css`opacity:0.8;`}>
            <strong>Recv:</strong> {lastReceived != null ? (lastReceived.length > 120 ? `${lastReceived.slice(0, 120)}…` : lastReceived) : '—'} {echoed && '✓'}
          </div>
        </div>
      )}
    </div>
  );
};
