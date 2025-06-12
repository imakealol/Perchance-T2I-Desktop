namespace Perchance
{
    partial class PerchanceBox
    {
        /// <summary> 
        /// Required designer variable.
        /// </summary>
        private System.ComponentModel.IContainer components = null;

        /// <summary> 
        /// Clean up any resources being used.
        /// </summary>
        /// <param name="disposing">true if managed resources should be disposed; otherwise, false.</param>
        protected override void Dispose(bool disposing)
        {
            if (disposing && (components != null))
            {
                components.Dispose();
            }
            base.Dispose(disposing);
        }

        #region Component Designer generated code

        /// <summary> 
        /// Required method for Designer support - do not modify 
        /// the contents of this method with the code editor.
        /// </summary>
        private void InitializeComponent()
        {
            components = new System.ComponentModel.Container();
            System.ComponentModel.ComponentResourceManager resources = new System.ComponentModel.ComponentResourceManager(typeof(PerchanceBox));
            tsImage = new ToolStrip();
            btnRefresh = new ToolStripButton();
            lblLabel = new ToolStripLabel();
            btnKeep = new ToolStripButton();
            txtSeed = new ToolStripTextBox();
            lblSeed = new ToolStripLabel();
            lblError = new Label();
            ptbImage = new PictureBox();
            cmsImage = new ContextMenuStrip(components);
            mniCopy = new ToolStripMenuItem();
            mniOpenWith = new ToolStripMenuItem();
            mniOpenLocation = new ToolStripMenuItem();
            wvCore = new Microsoft.Web.WebView2.WinForms.WebView2();
            tsImage.SuspendLayout();
            ((System.ComponentModel.ISupportInitialize)ptbImage).BeginInit();
            cmsImage.SuspendLayout();
            ((System.ComponentModel.ISupportInitialize)wvCore).BeginInit();
            SuspendLayout();
            // 
            // tsImage
            // 
            tsImage.BackColor = Color.White;
            tsImage.GripStyle = ToolStripGripStyle.Hidden;
            tsImage.Items.AddRange(new ToolStripItem[] { btnRefresh, lblLabel, btnKeep, txtSeed, lblSeed });
            tsImage.Location = new Point(0, 0);
            tsImage.Name = "tsImage";
            tsImage.Padding = new Padding(0);
            tsImage.RenderMode = ToolStripRenderMode.System;
            tsImage.Size = new Size(638, 25);
            tsImage.TabIndex = 3;
            tsImage.Text = "tsImage0";
            // 
            // btnRefresh
            // 
            btnRefresh.DisplayStyle = ToolStripItemDisplayStyle.Image;
            btnRefresh.Image = (Image)resources.GetObject("btnRefresh.Image");
            btnRefresh.ImageTransparentColor = Color.Magenta;
            btnRefresh.Name = "btnRefresh";
            btnRefresh.Size = new Size(23, 22);
            btnRefresh.Text = "Refresh";
            btnRefresh.Click += btnRefresh_Click;
            // 
            // lblLabel
            // 
            lblLabel.Name = "lblLabel";
            lblLabel.Size = new Size(49, 22);
            lblLabel.Text = "Image 0";
            // 
            // btnKeep
            // 
            btnKeep.Alignment = ToolStripItemAlignment.Right;
            btnKeep.CheckOnClick = true;
            btnKeep.DisplayStyle = ToolStripItemDisplayStyle.Image;
            btnKeep.Image = (Image)resources.GetObject("btnKeep.Image");
            btnKeep.ImageTransparentColor = Color.Magenta;
            btnKeep.Name = "btnKeep";
            btnKeep.Size = new Size(23, 22);
            btnKeep.Text = "Lock seed";
            // 
            // txtSeed
            // 
            txtSeed.Alignment = ToolStripItemAlignment.Right;
            txtSeed.BackColor = Color.White;
            txtSeed.BorderStyle = BorderStyle.None;
            txtSeed.Name = "txtSeed";
            txtSeed.Size = new Size(100, 25);
            txtSeed.TextBoxTextAlign = HorizontalAlignment.Right;
            // 
            // lblSeed
            // 
            lblSeed.Alignment = ToolStripItemAlignment.Right;
            lblSeed.Name = "lblSeed";
            lblSeed.Size = new Size(35, 22);
            lblSeed.Text = "Seed:";
            // 
            // lblError
            // 
            lblError.BackColor = Color.White;
            lblError.Dock = DockStyle.Fill;
            lblError.ForeColor = Color.Red;
            lblError.Location = new Point(0, 25);
            lblError.Name = "lblError";
            lblError.Size = new Size(638, 453);
            lblError.TabIndex = 4;
            lblError.TextAlign = ContentAlignment.MiddleCenter;
            // 
            // ptbImage
            // 
            ptbImage.BackColor = Color.White;
            ptbImage.ContextMenuStrip = cmsImage;
            ptbImage.Dock = DockStyle.Fill;
            ptbImage.Location = new Point(0, 25);
            ptbImage.Name = "ptbImage";
            ptbImage.Size = new Size(638, 453);
            ptbImage.SizeMode = PictureBoxSizeMode.Zoom;
            ptbImage.TabIndex = 5;
            ptbImage.TabStop = false;
            // 
            // cmsImage
            // 
            cmsImage.Items.AddRange(new ToolStripItem[] { mniCopy, mniOpenWith, mniOpenLocation });
            cmsImage.Name = "cmsImage";
            cmsImage.Size = new Size(150, 70);
            cmsImage.Opening += cmsImage_Opening;
            // 
            // mniCopy
            // 
            mniCopy.Image = (Image)resources.GetObject("mniCopy.Image");
            mniCopy.Name = "mniCopy";
            mniCopy.Size = new Size(149, 22);
            mniCopy.Text = "Copy";
            mniCopy.Click += mniCopy_Click;
            // 
            // mniOpenWith
            // 
            mniOpenWith.Image = (Image)resources.GetObject("mniOpenWith.Image");
            mniOpenWith.Name = "mniOpenWith";
            mniOpenWith.Size = new Size(149, 22);
            mniOpenWith.Text = "Open with...";
            mniOpenWith.Click += mniOpenWith_Click;
            // 
            // mniOpenLocation
            // 
            mniOpenLocation.Image = (Image)resources.GetObject("mniOpenLocation.Image");
            mniOpenLocation.Name = "mniOpenLocation";
            mniOpenLocation.Size = new Size(149, 22);
            mniOpenLocation.Text = "Open location";
            mniOpenLocation.Click += mniOpenLocation_Click;
            // 
            // wvCore
            // 
            wvCore.AllowExternalDrop = true;
            wvCore.CreationProperties = null;
            wvCore.DefaultBackgroundColor = Color.White;
            wvCore.Dock = DockStyle.Fill;
            wvCore.Location = new Point(0, 25);
            wvCore.Name = "wvCore";
            wvCore.Size = new Size(638, 453);
            wvCore.Source = new Uri("about:blank", UriKind.Absolute);
            wvCore.TabIndex = 6;
            wvCore.ZoomFactor = 1D;
            wvCore.CoreWebView2InitializationCompleted += wv2Captcha_CoreWebView2InitializationCompleted;
            // 
            // PerchanceBox
            // 
            AutoScaleDimensions = new SizeF(7F, 15F);
            AutoScaleMode = AutoScaleMode.Font;
            BorderStyle = BorderStyle.FixedSingle;
            Controls.Add(ptbImage);
            Controls.Add(lblError);
            Controls.Add(wvCore);
            Controls.Add(tsImage);
            Name = "PerchanceBox";
            Size = new Size(638, 478);
            tsImage.ResumeLayout(false);
            tsImage.PerformLayout();
            ((System.ComponentModel.ISupportInitialize)ptbImage).EndInit();
            cmsImage.ResumeLayout(false);
            ((System.ComponentModel.ISupportInitialize)wvCore).EndInit();
            ResumeLayout(false);
            PerformLayout();
        }

        #endregion

        private ToolStrip tsImage;
        private ToolStripButton btnRefresh;
        private ToolStripLabel lblLabel;
        private ToolStripButton btnKeep;
        private ToolStripTextBox txtSeed;
        private ToolStripLabel lblSeed;
        private Label lblError;
        private PictureBox ptbImage;
        private ContextMenuStrip cmsImage;
        private ToolStripMenuItem mniCopy;
        private ToolStripMenuItem mniOpenWith;
        private Microsoft.Web.WebView2.WinForms.WebView2 wvCore;
        private ToolStripMenuItem mniOpenLocation;
    }
}
