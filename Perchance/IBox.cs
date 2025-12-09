using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Perchance
{
    public interface IBox
    {
         bool Visible { get; set; }
         Task Generate(Configuration cfg);
         void BeginGenerate();
         void LoadImage(string imageLocation, Action? onLoaded = null);
         void EndGenerate();
    }
}
