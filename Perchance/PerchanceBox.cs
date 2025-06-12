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
        private readonly Promise promise;

        public async Task Generate(Configuration cfg)
        {
            lastCfg = cfg;
            var hasUserKey = false;
            var status = "";
            var style = styles.TryGetValue(cfg.ArtStyle, out var s) ? s : styles["No Style"];

            try
            {
                lblError.Text = "Preparing...";
                lblError.BringToFront();

                for (var repeatCount = 1; repeatCount <= 5; repeatCount++)
                {
                    if (!hasUserKey)
                    {
                        lblError.Text = "Verifying...";

                        cantok = new CancellationTokenSource();
                        wvCore.Source = new Uri($"https://image-generation.perchance.org/api/verifyUser?thread={Thread}&__cacheBust={rand.NextDouble()}");
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
                            default:
                                lblError.BringToFront();
                                lblError.Text = dt["status"] + " " + dt["reason"];
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
                    lblError.Text = $"{status} (r: {repeatCount}/5)";
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

        public PerchanceBox()
        {
            InitializeComponent();
            promise = new Promise(this);
            SetStyle(ControlStyles.OptimizedDoubleBuffer, true);
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
            wvCore.CoreWebView2.DOMContentLoaded += CoreWebView2_DOMContentLoaded;
        }

        private async void CoreWebView2_DOMContentLoaded(object? sender, CoreWebView2DOMContentLoadedEventArgs e)
        {
            var source = wvCore.Source.ToString();
            if (source.StartsWith("https://image-generation.perchance.org/"))
            {
                var html = await wvCore.ExecuteScriptAsync("document.documentElement.innerText");
                if (html.StartsWith("\"{"))
                    promise.SetResult(JsonSerializer.Deserialize<string>(html)!);
                else
                    promise.SetResult("{{}}");
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
