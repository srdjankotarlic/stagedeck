// Standalone Windows Stream Deck plugin. Uses Windows .NET Framework, not Node.js.
using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.IO;
using System.Net.WebSockets;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using System.Web.Script.Serialization;

internal static class StageDeckPlugin {
    private sealed class Key { public int Slot; public int Row; public int Column; }
    private static readonly ConcurrentDictionary<string, Key> Keys = new ConcurrentDictionary<string, Key>();
    private static readonly SemaphoreSlim DeckSend = new SemaphoreSlim(1, 1);
    private static readonly SemaphoreSlim BridgeSend = new SemaphoreSlim(1, 1);
    private static readonly CancellationTokenSource Lifetime = new CancellationTokenSource();
    private static ClientWebSocket Deck;
    private static ClientWebSocket Bridge;
    private static string[] Images = new string[0];
    private static object[] Devices = new object[0];
    private static string ConfigDirectory;
    private static volatile string Language = "en";
    private static volatile string Inspector;
    private static JavaScriptSerializer Serializer() { return new JavaScriptSerializer { MaxJsonLength = 16000000 }; }
    private static Dictionary<string, object> Map(object value) { return value as Dictionary<string, object> ?? new Dictionary<string, object>(); }
    private static object Get(Dictionary<string, object> value, string key) { object result; return value.TryGetValue(key, out result) ? result : null; }
    private static string Text(Dictionary<string, object> value, string key) { return Convert.ToString(Get(value, key)); }
    private static int Number(object value, int fallback) { int result; return value != null && int.TryParse(Convert.ToString(value), out result) ? result : fallback; }
    [STAThread]
    private static int Main(string[] args) {
        try { Run(args).GetAwaiter().GetResult(); return 0; }
        catch (Exception error) { Log(error.GetType().Name + ": " + error.Message); return 1; }
    }
    private static void Log(string message) {
        try {
            if (string.IsNullOrEmpty(ConfigDirectory)) ConfigDirectory = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "StageDeck");
            Directory.CreateDirectory(ConfigDirectory);
            string file = Path.Combine(ConfigDirectory, "streamdeck-plugin.log");
            if (File.Exists(file) && new FileInfo(file).Length > 256000) File.Delete(file);
            File.AppendAllText(file, DateTime.UtcNow.ToString("o") + " " + message + Environment.NewLine);
        } catch { }
    }
    private static async Task Run(string[] args) {
        var options = new Dictionary<string, string>();
        for (int i = 0; i + 1 < args.Length; i += 2) options[args[i]] = args[i + 1];
        ConfigDirectory = Environment.GetEnvironmentVariable("STAGEDECK_TEST_DATA");
        if (string.IsNullOrEmpty(ConfigDirectory)) ConfigDirectory = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "StageDeck");
        if (options.ContainsKey("-info")) { var info = Map(Serializer().DeserializeObject(options["-info"])); Devices = Get(info, "devices") as object[] ?? new object[0]; }
        Deck = new ClientWebSocket();
        Deck.Options.Proxy = null;
        await Deck.ConnectAsync(new Uri("ws://127.0.0.1:" + options["-port"]), Lifetime.Token);
        await Send(Deck, DeckSend, new { @event = options["-registerEvent"], uuid = options["-pluginUUID"] });
        Log("Elgato registered; devices=" + Devices.Length);
        Task connection = ConnectBridge();
        Exception failure = null;
        try { await Receive(Deck, OnDeck); }
        catch (Exception error) { failure = error; }
        finally { Lifetime.Cancel(); if (Bridge != null) Bridge.Abort(); Deck.Abort(); }
        try { await connection; } catch { }
        if (failure != null) throw failure;
    }
    private static async Task Send(ClientWebSocket socket, SemaphoreSlim gate, object value) {
        await gate.WaitAsync(Lifetime.Token);
        try {
            if (socket == null || socket.State != WebSocketState.Open) return;
            byte[] bytes = Encoding.UTF8.GetBytes(Serializer().Serialize(value));
            await socket.SendAsync(new ArraySegment<byte>(bytes), WebSocketMessageType.Text, true, Lifetime.Token);
        } finally { gate.Release(); }
    }
    private static Task Event(string name, string context, object payload) { return Send(Deck, DeckSend, new { @event = name, context = context, payload = payload }); }
    private static async Task Receive(ClientWebSocket socket, Func<Dictionary<string, object>, Task> handler) {
        byte[] buffer = new byte[16384];
        while (socket.State == WebSocketState.Open && !Lifetime.IsCancellationRequested) {
            using (var message = new MemoryStream()) {
                WebSocketReceiveResult frame;
                do {
                    frame = await socket.ReceiveAsync(new ArraySegment<byte>(buffer), Lifetime.Token);
                    if (frame.MessageType == WebSocketMessageType.Close) return;
                    message.Write(buffer, 0, frame.Count);
                    if (message.Length > 16000000) throw new InvalidDataException("Oversized Stream Deck message");
                } while (!frame.EndOfMessage);
                if (frame.MessageType == WebSocketMessageType.Text) await handler(Map(Serializer().DeserializeObject(Encoding.UTF8.GetString(message.ToArray()))));
            }
        }
    }
    private static async Task Paint(string context) {
        Key key; if (!Keys.TryGetValue(context, out key)) return;
        string[] images = Images;
        if (key.Slot >= 0 && key.Slot < images.Length && !string.IsNullOrEmpty(images[key.Slot])) {
            await Event("setImage", context, new { image = images[key.Slot], target = 0 });
            await Event("setTitle", context, new { title = "", target = 0 });
        } else {
            await Event("setImage", context, new { image = "images/key.png", target = 0 });
            await Event("setTitle", context, new { title = Bridge != null && Bridge.State == WebSocketState.Open ? (Language == "sr" ? "Taster " : "Key ") + (key.Slot + 1) : Language == "sr" ? "Otvori\nStageDeck" : "Open\nStageDeck", target = 0 });
        }
    }
    private static async Task Hello() {
        try { await Send(Bridge, BridgeSend, new { type = "hello", devices = Devices }); }
        catch (WebSocketException) { }
        catch (ObjectDisposedException) { }
    }
    private static async Task ConnectBridge() {
        while (!Lifetime.IsCancellationRequested) {
            ClientWebSocket socket = null;
            try {
                var config = Map(Serializer().DeserializeObject(File.ReadAllText(Path.Combine(ConfigDirectory, "bridge.json"))));
                int port = Number(Get(config, "port"), 0); string token = Text(config, "token");
                if (port < 1 || port > 65535 || token.Length < 1) throw new InvalidDataException("Invalid bridge configuration");
                socket = new ClientWebSocket(); socket.Options.Proxy = null; Bridge = socket;
                using (var timeout = CancellationTokenSource.CreateLinkedTokenSource(Lifetime.Token)) {
                    timeout.CancelAfter(4000);
                    await socket.ConnectAsync(new Uri("ws://127.0.0.1:" + port + "/deck?token=" + Uri.EscapeDataString(token)), timeout.Token);
                }
                await Hello();
                Log("StageDeck bridge connected");
                foreach (string context in Keys.Keys) await Paint(context);
                await Receive(socket, OnBridge);
            } catch (OperationCanceledException) { if (Lifetime.IsCancellationRequested) return; }
            catch (Exception error) { Log("Bridge: " + error.GetType().Name); }
            finally {
                if (socket != null) socket.Dispose();
                if (Bridge == socket) Bridge = null;
                Log("StageDeck bridge disconnected");
                Images = new string[0];
            }
            if (Lifetime.IsCancellationRequested) return;
            foreach (string context in Keys.Keys) await Paint(context);
            await Task.Delay(1500, Lifetime.Token);
        }
    }
    private static async Task OnBridge(Dictionary<string, object> message) {
        string type = Text(message, "type");
        if (type == "state") {
            string next = Text(Map(Get(message, "state")), "language") == "sr" ? "sr" : "en";
            if (Language != next) {
                Language = next;
                string inspector = Inspector;
                if (!string.IsNullOrEmpty(inspector)) await Event("sendToPropertyInspector", inspector, new { language = Language });
                if (Images.Length == 0) foreach (string context in Keys.Keys) await Paint(context);
            }
        }
        if (type == "keys") {
            var values = Get(message, "images") as object[];
            if (values == null || values.Length != 32) return;
            if (Images.Length == 0) Log("Received 32 key images");
            var images = new string[32]; for (int i = 0; i < 32; i++) images[i] = Convert.ToString(values[i]); Images = images;
            foreach (string context in Keys.Keys) await Paint(context);
        }
        if (type == "result" && Get(message, "ok") is bool) {
            Log("Command result: " + ((bool)message["ok"] ? "ok" : "failed"));
            if (!(bool)message["ok"]) await Event("showAlert", Text(message, "id"), new { });
        }
    }
    private static async Task OnDeck(Dictionary<string, object> message) {
        string type = Text(message, "event"), context = Text(message, "context");
        var payload = Map(Get(message, "payload"));
        if (type == "willAppear" || type == "didReceiveSettings") {
            Key old; Keys.TryGetValue(context, out old);
            var coords = Map(Get(payload, "coordinates"));
            int row = Number(Get(coords, "row"), old == null ? 0 : old.Row), column = Number(Get(coords, "column"), old == null ? 0 : old.Column);
            int slot = Number(Get(Map(Get(payload, "settings")), "slot"), row * 8 + column);
            if (slot < 0 || slot > 31) slot = row * 8 + column;
            Keys[context] = new Key { Slot = slot, Row = row, Column = column }; await Paint(context);
        }
        if (type == "propertyInspectorDidAppear" || (type == "sendToPlugin" && Text(payload, "request") == "language")) {
            Inspector = context;
            await Event("sendToPropertyInspector", context, new { language = Language });
        }
        if (type == "propertyInspectorDidDisappear" && Inspector == context) Inspector = null;
        if (type == "willDisappear") { Key old; Keys.TryRemove(context, out old); }
        if (type == "keyDown") {
            Key key; if (!Keys.TryGetValue(context, out key)) return;
            Log("Hardware keyDown slot=" + (key.Slot + 1));
            bool failed = false;
            try {
                if (Bridge != null && Bridge.State == WebSocketState.Open) await Send(Bridge, BridgeSend, new { type = "command", command = "toggle", payload = new { index = key.Slot }, id = context });
                else failed = true;
            } catch (WebSocketException) { failed = true; }
            catch (ObjectDisposedException) { failed = true; }
            if (failed) await Event("showAlert", context, new { });
        }
        if (type == "deviceDidConnect") {
            Log("Elgato device connected");
            var device = Map(Get(message, "deviceInfo")); device["id"] = Get(message, "device");
            var devices = new List<object>(Devices); devices.Add(device); Devices = devices.ToArray(); await Hello();
        }
        if (type == "deviceDidDisconnect") {
            Log("Elgato device disconnected");
            var devices = new List<object>(); foreach (object device in Devices) if (Text(Map(device), "id") != Text(message, "device")) devices.Add(device);
            Devices = devices.ToArray(); await Hello();
        }
    }
}
