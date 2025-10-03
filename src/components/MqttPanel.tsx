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
        // Do NOT overwrite the staged control value from incoming messages.
        // We only update meta (lastReceived/echoed). The user will click Send to publish staged values.
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

  // Stage a value and publish only on click (no auto-publish on change)
  const [stagedValue, setStagedValue] = useState<string | number | boolean>('');

  // Seed defaults whenever mode/config changes
  useEffect(() => {
    switch (options.mode) {
      case 'Text':
        setStagedValue('');
        break;
      case 'Slider': {
        const min = Number(options.model?.minValue ?? 0);
        const def = options.model?.defaultValue != null ? Number(options.model.defaultValue) : min;
        setStagedValue(def);
        break;
      }
      case 'Switch': {
        const def = Boolean(options.model?.default ?? false);
        setStagedValue(def);
        break;
      }
      case 'Button':
      default:
        // Button uses payload from options; nothing to stage
        break;
    }
  }, [
    options.mode,
    options.model?.minValue,
    options.model?.defaultValue,
    options.model?.default,
  ]);

  // IMPORTANT: Do not overwrite stagedValue from incoming messages.
  // Ensure your on('message') handler only updates meta (lastReceived/echo) and NOT stagedValue.
  const publish = useCallback(() => {
    if (!clientRef.current || !connected || !options.publishTopic || options.receiveOnly) return;

    let payload: string;

    switch (options.mode) {
      case 'Text': {
        const v = typeof stagedValue === 'string' ? stagedValue : String(stagedValue);
        payload = v;
        break;
      }
      case 'Slider': {
        payload = String(Number(stagedValue));
        break;
      }
      case 'Switch': {
        const onVal = options.model?.onValue ?? '1';
        const offVal = options.model?.offValue ?? '0';
        payload = Boolean(stagedValue) ? String(onVal) : String(offVal);
        break;
      }
      case 'Button':
      default: {
        // Button payload comes from panel options (no input field in the panel)
        const btn = options.model?.buttonValue ?? options.button?.value ?? '1';
        payload = String(btn);
        break;
      }
    }

    log('publish', { topic: options.publishTopic, payload });
    clientRef.current.publish(options.publishTopic, payload, {
      qos: options.qos ?? 0,
      retain: options.retain ?? false,
    });
    setLastSent(payload);
    setEchoed(false);
  }, [
    clientRef,
    connected,
    options.publishTopic,
    options.receiveOnly,
    options.mode,
    stagedValue,
    options.model?.onValue,
    options.model?.offValue,
    options.model?.buttonValue,
    options.button?.value,
    options.qos,
    options.retain,
    log,
  ]);

  const controls = useMemo(() => {
    switch (options.mode) {
      case 'Text':
        return (
          <InlineFieldRow>
            <InlineField label="Value">
              <Input
                width={30}
                value={typeof stagedValue === 'string' ? stagedValue : String(stagedValue)}
                onChange={(e) => setStagedValue(e.currentTarget.value)}
              />
            </InlineField>
            <Button onClick={publish} disabled={!connected || !options.publishTopic}>
              {options.model?.text || options.text || 'Send'}
            </Button>
          </InlineFieldRow>
        );

      case 'Slider': {
        const min = Number(options.model?.minValue ?? 0);
        const max = Number(options.model?.maxValue ?? 100);
        const step = Number(options.model?.step ?? 1);
        const current = Number(stagedValue);
        return (
          <InlineFieldRow>
            <InlineField label={`${options.model?.text || 'Value'}: ${current}`} grow>
              <Slider
                min={min}
                max={max}
                step={step}
                value={current}
                onChange={(v) => setStagedValue(v)}
              />
            </InlineField>
            <Button onClick={publish} disabled={!connected || !options.publishTopic}>
              {options.model?.text || options.text || 'Send'}
            </Button>
          </InlineFieldRow>
        );
      }

      case 'Switch': {
        const checked = Boolean(stagedValue);
        return (
          <InlineFieldRow>
            <InlineField label={options.model?.text || options.text || 'Toggle'}>
              <Switch
                value={checked}
                onChange={(e) => setStagedValue(e.currentTarget.checked)}
              />
            </InlineField>
            <Button onClick={publish} disabled={!connected || !options.publishTopic}>
              {options.model?.text || options.text || 'Send'}
            </Button>
          </InlineFieldRow>
        );
      }

      case 'Button':
      default: {
        // Single button; payload is configured in panel options (options.model.buttonValue)
        return (
          <InlineFieldRow>
            <Button onClick={publish} disabled={!connected || !options.publishTopic}>
              {options.model?.text || options.text || 'Send'}
            </Button>
          </InlineFieldRow>
        );
      }
    }
  }, [options.mode, options.model, options.text, stagedValue, connected, options.publishTopic, publish]);

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
      {controls}
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
