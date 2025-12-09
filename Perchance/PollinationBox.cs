using System.Diagnostics;
using System.Web;
using static Perchance.ArtStyle;

namespace Perchance
{
    public partial class PollinationBox : UserControl, IBox
    {
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
        private Configuration? lastCfg;

        public async Task Generate(Configuration cfg)
        {
            lastCfg = cfg;
            var style = styles.TryGetValue(cfg.ArtStyle, out var s) ? s : styles["No Style"];

            try
            {
                if (txtSeed.Text == "-1" || string.IsNullOrWhiteSpace(txtSeed.Text))
                    txtSeed.Text = rand.Next().ToString();

                var hc = new HttpClient();
                var prompt = $"Make an image with:\n\n**Positive**:\n{style!.MakePrompt(cfg)}\n\n**Negative**:\n{style!.MakeNegative(cfg)}";

                var url = $"https://image.pollinations.ai/prompt/{HttpUtility.UrlEncode(prompt)}?width={cfg.Width}&height={cfg.Height}&model=flux&seed={txtSeed.Text}&nologo=true&private=true&temperature={cfg.GuidanceScale / 10.0f}";
                var dir = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "history", cfg.Hash, txtSeed.Text + ".jpg");

                using var stream = await hc.GetStreamAsync(url, Global.Cancellation.Token);
                using var fs = new FileStream(dir, FileMode.OpenOrCreate);
                await stream.CopyToAsync(fs, Global.Cancellation.Token);

                ptbImage.ImageLocation = dir;
                ptbImage.BringToFront();
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
            lblError.Text = "Generating...";

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

        public PollinationBox(int thread)
        {
            InitializeComponent();
            SetStyle(ControlStyles.OptimizedDoubleBuffer, true);
            Thread = thread;
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

        private void ptbImage_DoubleClick(object sender, EventArgs e)
        {
            if (ptbImage.ImageLocation is not null)
                Process.Start("explorer.exe", "\"" + ptbImage.ImageLocation + "\"");
        }
    }
}
