using Microsoft.Web.WebView2.Core;
using System.Data;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Text.Json;
using static Perchance.ArtStyle;

namespace Perchance
{
    public partial class PerchanceBox : UserControl
    {
        private CancellationTokenSource? cantok;
        private string? result;

        [ComVisible(true)]
        public class Promise(PerchanceBox frm)
        {
            public void SetResult(string result)
            {
                frm.result = result;
                frm.cantok!.Cancel();
            }
        }

        public int Thread
        {
            get => thread;
            set
            {
                thread = value;
                lblLabel.Text = "Image " + value;
            }
        }

        private int thread;
        private string? key;
        private string? adAccessCode = "";
        private Configuration? lastCfg;
        private Promise promise;

        public async Task Generate(Configuration cfg)
        {
            lastCfg = cfg;
            var hasUserKey = false;
            var status = "";
            var style = styles.TryGetValue(cfg.ArtStyle, out var s) ? s : styles["No Style"];
            var token = "";

            try
            {
                lblError.Text = "Preparing...";
                lblError.BringToFront();

                while (!btnRefresh.Enabled)
                {
                    if (!hasUserKey)
                    {
                        lblError.Text = "Verifying...";

                        cantok = new CancellationTokenSource();
                        wvCore.Source = new Uri($"https://image-generation.perchance.org/api/verifyUser?thread={Thread}&__cacheBust={rand.NextDouble()}{token}");
                        await Task.Run(() => cantok.Token.WaitHandle.WaitOne(), Global.Cancellation.Token);

                        Dictionary<string, string>? dt;
                        if (result != null)
                            dt = JsonSerializer.Deserialize<Dictionary<string, string>>(result);
                        else
                            return;

                        if (dt == null)
                        {
                            lblError.BringToFront();
                            lblError.Text = "Verified failure !";
                            return;
                        }

                        switch (dt["status"])
                        {
                            case "already_verified":
                            case "success":
                                key = dt["userKey"];
                                hasUserKey = false;
                                break;
                            case "too_many_requests":
                                lblError.BringToFront();
                                lblError.Text = dt["status"];
                                if (dt.TryGetValue("reason", out var reason))
                                    lblError.Text += " " + reason;
                                await Task.Delay(5000, Global.Cancellation.Token);
                                continue;
                            default:
                                lblError.BringToFront();
                                lblError.Text = dt["status"];
                                if (dt.TryGetValue("reason", out reason))
                                    lblError.Text += " " + reason;
                                await Task.Delay(5000, Global.Cancellation.Token);

                                cantok = new CancellationTokenSource();
                                wvCore.Source = new Uri("https://image-generation.perchance.org/embed");
                                wvCore.BringToFront();
                                await Task.Run(() => cantok.Token.WaitHandle.WaitOne(), Global.Cancellation.Token);

                                if (result != null)
                                {
                                    token = "&token=" + result;
                                    continue;
                                }
                                else
                                    return;
                        }
                    }

                    lblError.Text = "Generating...";
                    var queryParams = new Dictionary<string, string>
                    {
                        { "prompt", style!.MakePrompt(cfg) },
                        { "seed", txtSeed.Text },
                        { "resolution", $"{cfg.Width}x{cfg.Height}" },
                        { "guidanceScale", $"{cfg.GuidanceScale}" },
                        { "negativePrompt", style.MakeNegative(cfg) },
                        { "channel", "pretty-ai" },
                        { "subChannel", "public" },
                        { "userKey", key! },
                        { "adAccessCode", adAccessCode! },
                        { "requestId", $"{rand.NextDouble()}" },
                        { "__cacheBust", $"{rand.NextDouble()}" },
                        { "bdf", $"{rand.NextDouble()}" }
                    }.Select(kv => $"{kv.Key}={Uri.EscapeDataString(kv.Value)}");
                    cantok = new CancellationTokenSource();
                    wvCore.Source = new Uri($"https://image-generation.perchance.org/api/generate?{string.Join("&", queryParams)}");
                    await Task.Run(cantok.Token.WaitHandle.WaitOne, Global.Cancellation.Token);

                    Dictionary<string, object>? data;
                    if (result != null)
                        data = JsonSerializer.Deserialize<Dictionary<string, object>>(result);
                    else
                        return;

                    if (data == null)
                    {
                        lblError.BringToFront();
                        lblError.Text = "Generated failure !";
                        return;
                    }

                    switch (status = data["status"].ToString())
                    {
                        case "success":
                            lblError.Text = "Downloading...";

                            var imageId = data["imageId"];

                            cantok = new CancellationTokenSource();
                            wvCore.Source = new Uri($"https://image-generation.perchance.org/api/downloadTemporaryImage?imageId={imageId}");
                            await Task.Run(cantok.Token.WaitHandle.WaitOne, Global.Cancellation.Token);
                            if (result != null)
                            {
                                var result = await wvCore.ExecuteScriptAsync(@"(() => {
                                    const img = document.querySelector('img');
                                    const canvas = document.createElement('canvas');
                                    canvas.width = img.naturalWidth;
                                    canvas.height = img.naturalHeight;
                                    const ctx = canvas.getContext('2d');
                                    ctx.drawImage(img, 0, 0);
                                    return canvas.toDataURL('image/png');
                                })()");
                                string base64Data = result.Trim('"').Replace("\\u003d", "=").Replace("\\", "");
                                string base64 = base64Data.Substring(base64Data.IndexOf(',') + 1);
                                byte[] imageBytes = Convert.FromBase64String(base64);

                                var dir = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "history", cfg.Hash, data["seed"] + ".jpg");
                                await File.WriteAllBytesAsync(dir, imageBytes, Global.Cancellation.Token);
                                ptbImage.ImageLocation = dir;

                                txtSeed.Text = data["seed"].ToString();
                                ptbImage.BringToFront();
                            }
                            else
                                return;
                            return;
                        case "invalid_ad_access_code":
                            lblError.Text = "Bypass Ads Protect...";

                            var accessCodeUrl = $"https://perchance.org/api/getAccessCodeForAdPoweredStuff?__cacheBust={rand.NextDouble()}";
                            cantok = new CancellationTokenSource();
                            wvCore.Source = new Uri(accessCodeUrl);
                            await Task.Run(cantok.Token.WaitHandle.WaitOne, Global.Cancellation.Token);
                            adAccessCode = result;
                            break;
                        case "gen_failure":
                        case "waiting_for_prev_request_to_finish":
                            await Task.Delay(3000, Global.Cancellation.Token);
                            break;
                        case "invalid_key":
                            await Task.Delay(3000, Global.Cancellation.Token);
                            hasUserKey = false;
                            break;
                    }

                    lblError.BringToFront();
                    lblError.Text = $"{status} (retry...)";
                }
            }
            catch (Exception e)
            {
                lblError.BringToFront();
                lblError.Text = e.Message;
            }
            finally
            {
                Global.Semaphore.Release();
            }
        }

        public void BeginGenerate()
        {
            Visible = true;

            btnRefresh.Enabled = false;
            btnKeep.Enabled = false;

            lblError.BringToFront();
            lblError.Text = "Preparing...";

            if (!btnKeep.Checked)
                txtSeed.Text = "-1";
        }

        public void LoadImage(string imageLocation, Action? onLoaded = null)
        {
            try
            {
                txtSeed.Text = Path.GetFileNameWithoutExtension(imageLocation);
                ptbImage.ImageLocation = imageLocation;
                ptbImage.BringToFront();
                Visible = true;
                onLoaded?.Invoke();
            }
            catch
            {
            }
        }

        public void EndGenerate()
        {
            btnRefresh.Enabled = true;
            btnKeep.Enabled = true;
        }

        public PerchanceBox(int thread)
        {
            InitializeComponent();
            SetStyle(ControlStyles.OptimizedDoubleBuffer, true);
            Thread = thread;

            var env = CoreWebView2Environment.CreateAsync(null, "Thread_" + thread).Result;
            wvCore.EnsureCoreWebView2Async(env);

            promise = new Promise(this);
        }

        private async void btnRefresh_Click(object sender, EventArgs e)
        {
            if (lastCfg != null)
            {
                BeginGenerate();
                await Generate(lastCfg);
                EndGenerate();
            }
        }

        private void wv2Captcha_CoreWebView2InitializationCompleted(object sender, CoreWebView2InitializationCompletedEventArgs e)
        {
            wvCore.CoreWebView2.DOMContentLoaded += wvCore_DOMContentLoaded;

            wvCore.CoreWebView2.AddHostObjectToScript("shared", promise);
            wvCore.CoreWebView2.WebResourceRequested += wvCore_WebResourceRequested;
            wvCore.CoreWebView2.AddWebResourceRequestedFilter("https://image-generation.perchance.org/embed", CoreWebView2WebResourceContext.Document);
        }

        private void wvCore_WebResourceRequested(object? sender, CoreWebView2WebResourceRequestedEventArgs e)
        {
            var def = e.GetDeferral();

            var stream = new MemoryStream();
            var writer = new StreamWriter(stream);
            writer.Write("""
            <!DOCTYPE html>
            <html>
            <head>
                <script src="https://challenges.cloudflare.com/turnstile/v0/api.js"></script>
            </head>
            <body style="background: dimgray; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; padding: 0">
                <div id="turnstile-widget">
                    <svg xmlns="http://www.w3.org/2000/svg" width="120" height="30" viewBox="0 0 120 30" fill="#fff">
                        <circle cx="15" cy="15" r="15">
                            <animate attributeName="r" from="15" to="15" begin="0s" dur="0.8s" values="15;9;15" calcMode="linear" repeatCount="indefinite"/>
                            <animate attributeName="fill-opacity" from="1" to="1" begin="0s" dur="0.8s" values="1;.5;1" calcMode="linear" repeatCount="indefinite"/>
                        </circle>
                        <circle cx="60" cy="15" r="9" fill-opacity="0.3">
                            <animate attributeName="r" from="9" to="9" begin="0s" dur="0.8s" values="9;15;9" calcMode="linear" repeatCount="indefinite"/>
                            <animate attributeName="fill-opacity" from="0.5" to="0.5" begin="0s" dur="0.8s" values=".5;1;.5" calcMode="linear" repeatCount="indefinite"/>
                        </circle>
                        <circle cx="105" cy="15" r="15">
                            <animate attributeName="r" from="15" to="15" begin="0s" dur="0.8s" values="15;9;15" calcMode="linear" repeatCount="indefinite"/>
                            <animate attributeName="fill-opacity" from="1" to="1" begin="0s" dur="0.8s" values="1;.5;1" calcMode="linear" repeatCount="indefinite"/>
                        </circle>
                    </svg>
                </div>
                <script type="text/javascript">
                    turnstile.render('#turnstile-widget', {
                        sitekey: '0x4AAAAAAAA8g8NphwaSOT59',
                        theme: 'light',
                        callback: function(token) {
                            chrome.webview.hostObjects.shared.SetResult(token);
                        }
                    });
                    setTimeout(() => location.reload(), 5000);
                </script>
            </body>
            </html>
            """);
            writer.Flush();
            stream.Position = 0;
            e.Response = wvCore.CoreWebView2.Environment.CreateWebResourceResponse(stream, 200, "OK", "");

            def.Complete();
        }

        private async void wvCore_DOMContentLoaded(object? sender, CoreWebView2DOMContentLoadedEventArgs e)
        {
            var source = wvCore.Source.ToString();
            if (source.StartsWith("https://image-generation.perchance.org/api"))
            {
                var html = await wvCore.ExecuteScriptAsync("document.documentElement.innerText");
                if (html.StartsWith("\"{"))
                    promise.SetResult(JsonSerializer.Deserialize<string>(html)!);
                else
                    promise.SetResult("{}");
            }
        }

        private void cmsImage_Opening(object sender, System.ComponentModel.CancelEventArgs e)
        {
            mniOpenWith.Enabled = cmsImage.SourceControl is PictureBox { ImageLocation: not null };
            mniOpenLocation.Enabled = cmsImage.SourceControl is PictureBox { ImageLocation: not null };
        }

        private void mniCopy_Click(object sender, EventArgs e)
        {
            if (cmsImage.SourceControl is PictureBox ptb)
            {
                Clipboard.SetImage(ptb.Image);
                Toast.Show("Image copied !");
            }
        }

        private void mniOpenWith_Click(object sender, EventArgs e)
        {
            if (cmsImage.SourceControl is PictureBox ptb)
                Process.Start("rundll32.exe", "shell32.dll,OpenAs_RunDLL " + ptb.ImageLocation);
        }

        private void mniOpenLocation_Click(object sender, EventArgs e)
        {
            if (cmsImage.SourceControl is PictureBox ptb)
                Process.Start("explorer.exe", "/select, \"" + ptb.ImageLocation + "\"");
        }
    }
}
