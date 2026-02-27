import svgPaths from "./svg-vz3fosb0v5";
import imgProfilePicture from "figma:asset/4b5f4ef1982ec6672e2503261eebd452dea5062f.png";

function TimeContainer() {
  return (
    <div className="h-[18.61px] relative shrink-0 w-[47.855px]" data-name="Time Container">
      <p className="absolute css-4hzbpn font-['SF_Pro_Display:Semibold',sans-serif] leading-[19.496px] left-[23.93px] not-italic text-[#040415] text-[15.065px] text-center top-[-0.51px] tracking-[-0.3616px] translate-x-[-50%] w-[47.855px]" style={{ fontFeatureSettings: "'case'" }}>
        9:41
      </p>
    </div>
  );
}

function DarkModeOn() {
  return (
    <div className="h-[9.645px] relative shrink-0 w-[58.067px]" data-name="Dark Mode On">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 58.0668 9.64547">
        <g id="Dark Mode On">
          <g id="Battery">
            <rect height="8.90351" id="Border" opacity="0.35" rx="2.22588" stroke="var(--stroke-0, #040415)" strokeWidth="0.741959" width="17.807" x="38.1615" y="0.37098" />
            <path d={svgPaths.pe828880} fill="var(--fill-0, #040415)" id="Cap" opacity="0.4" />
            <rect fill="var(--fill-0, #040415)" height="6.67764" id="Capacity" rx="0.989279" width="15.5811" x="39.2744" y="1.48392" />
          </g>
          <path d={svgPaths.p2adf2500} fill="var(--fill-0, #040415)" id="Wifi" />
          <path d={svgPaths.p4309900} fill="var(--fill-0, #040415)" id="Cellular Connection" />
        </g>
      </svg>
    </div>
  );
}

function StatusBar() {
  return (
    <div className="absolute content-stretch flex h-[45px] items-center justify-between left-px pb-[11.508px] pl-[25.892px] pr-[24.933px] pt-[13.426px] top-0 w-[374px]" data-name="Status Bar">
      <TimeContainer />
      <DarkModeOn />
    </div>
  );
}

function HomeIndicatorIPhone() {
  return (
    <div className="absolute bottom-0 h-[32px] left-[calc(50%-0.5px)] translate-x-[-50%] w-[375px]" data-name="🧰/Home Indicator (iPhone)">
      <div className="absolute bg-[#040415] bottom-[7.67px] h-[4.795px] left-[calc(50%+0.5px)] rounded-[95.897px] translate-x-[-50%] w-[128.503px]" data-name="Home Indicator" />
    </div>
  );
}

function ShadowBg() {
  return (
    <div className="absolute left-[25px] size-[230px] top-[-76px]" data-name="Shadow BG">
      <div className="absolute inset-[-193.33%]">
        <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 1119.33 1119.33">
          <g id="Shadow BG">
            <g filter="url(#filter0_f_1_2709)" id="Ellipse 3">
              <circle cx="559.667" cy="559.667" fill="var(--fill-0, #5B5B5B)" r="115" />
            </g>
          </g>
          <defs>
            <filter colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse" height="1119.33" id="filter0_f_1_2709" width="1119.33" x="0" y="0">
              <feFlood floodOpacity="0" result="BackgroundImageFix" />
              <feBlend in="SourceGraphic" in2="BackgroundImageFix" mode="normal" result="shape" />
              <feGaussianBlur result="effect1_foregroundBlur_1_2709" stdDeviation="222.333" />
            </filter>
          </defs>
        </svg>
      </div>
    </div>
  );
}

function HeaderContainer() {
  return (
    <div className="content-stretch flex flex-col gap-[4px] items-start not-italic relative shrink-0" data-name="Header Container">
      <p className="css-ew64yg font-['SF_Pro_Display:Regular',sans-serif] leading-[16px] relative shrink-0 text-[12px] text-[rgba(4,4,21,0.6)] text-center">Hey, Fahmi 👋</p>
      <div className="css-g0mm18 font-['SF_Pro_Display:Light',sans-serif] leading-[33px] relative shrink-0 text-[#040415] text-[28px] tracking-[0.364px]">
        <p className="css-ew64yg mb-0">{`Welcome to `}</p>
        <p className="css-ew64yg">SmartHome!</p>
      </div>
    </div>
  );
}

function ProfilePicture() {
  return (
    <div className="relative rounded-[42px] shadow-[0px_0px_28px_0px_rgba(0,0,0,0.12)] shrink-0 size-[70px]" data-name="Profile Picture">
      <div aria-hidden="true" className="absolute inset-0 pointer-events-none rounded-[42px]">
        <div className="absolute inset-0 rounded-[42px]" style={{ backgroundImage: "linear-gradient(140.848deg, rgb(32, 32, 45) 1.2863%, rgb(16, 16, 19) 103.1%)" }} />
        <img alt="" className="absolute max-w-none object-cover rounded-[42px] size-full" src={imgProfilePicture} />
      </div>
    </div>
  );
}

function ProfilePictureContainer() {
  return (
    <div className="content-stretch flex items-center p-[6px] relative rounded-[100px] shrink-0" data-name="Profile Picture Container">
      <div aria-hidden="true" className="absolute border-2 border-[rgba(4,4,21,0.1)] border-solid inset-0 pointer-events-none rounded-[100px]" />
      <ProfilePicture />
    </div>
  );
}

function Header() {
  return (
    <div className="absolute content-stretch flex items-center justify-between left-[22px] top-[61px] w-[331px]" data-name="Header">
      <HeaderContainer />
      <ProfilePictureContainer />
    </div>
  );
}

function Calendar() {
  return (
    <div className="absolute inset-[8.33%_12.5%]" data-name="Calendar">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 12 13.3333">
        <g id="Calendar">
          <path d={svgPaths.p3d525a00} fill="var(--fill-0, #040415)" id="Fill 1" />
          <path d={svgPaths.p341d7300} fill="var(--fill-0, #040415)" id="Fill 4" opacity="0.4" />
          <path d={svgPaths.p101bb600} fill="var(--fill-0, #151924)" id="Fill 6" />
          <path d={svgPaths.p3adc6920} fill="var(--fill-0, #151924)" id="Fill 9" />
        </g>
      </svg>
    </div>
  );
}

function Iconly() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="Iconly">
      <Calendar />
    </div>
  );
}

function InfoCardDateContainer() {
  return (
    <div className="content-stretch flex gap-[2px] items-start opacity-40 relative shrink-0" data-name="Info Card Date Container">
      <Iconly />
      <p className="css-ew64yg font-['SF_Pro_Display:Regular',sans-serif] leading-[16px] not-italic relative shrink-0 text-[#040415] text-[12px] text-center">26 June 2024</p>
    </div>
  );
}

function InfoCard() {
  return (
    <div className="content-stretch flex flex-col gap-[6px] items-start relative shrink-0" data-name="Info Card">
      <InfoCardDateContainer />
      <p className="css-ew64yg font-['SF_Pro_Display:Semibold',sans-serif] leading-[22px] not-italic relative shrink-0 text-[#040415] text-[17px] text-center tracking-[0.59px]">Energy Usage</p>
    </div>
  );
}

function InfoCardContainer() {
  return (
    <div className="content-stretch flex flex-col gap-[4px] items-start relative shrink-0" data-name="Info Card Container">
      <InfoCard />
      <p className="css-ew64yg font-['SF_Pro_Display:Regular',sans-serif] leading-[0] not-italic relative shrink-0 text-[#040415] text-[0px] text-center tracking-[0.364px]">
        <span className="leading-[34px] text-[#65cf58] text-[28px]">321.4</span>
        <span className="leading-[34px] text-[28px]">{` `}</span>
        <span className="leading-[20px] text-[15px] text-[rgba(4,4,21,0.4)] tracking-[-0.24px]">KW/h</span>
      </p>
    </div>
  );
}

function InfoCardImageContainer() {
  return (
    <div className="h-[89px] relative shrink-0 w-[145px]" data-name="Info Card Image Container">
      <div className="absolute inset-[-49.44%_-8.28%_-13.48%_-8.28%]">
        <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 169 145">
          <g id="Info Card Image Container">
            <g filter="url(#filter0_d_1_2664)" id="Ellipse 7">
              <circle cx="85" cy="69" fill="url(#paint0_linear_1_2664)" r="25" />
            </g>
            <g data-figma-bg-blur-radius="14" filter="url(#filter1_d_1_2664)" id="Union">
              <path d={svgPaths.p14ae7680} fill="var(--fill-0, white)" fillOpacity="0.6" shapeRendering="crispEdges" />
            </g>
          </g>
          <defs>
            <filter colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse" height="138" id="filter0_d_1_2664" width="138" x="16" y="0">
              <feFlood floodOpacity="0" result="BackgroundImageFix" />
              <feColorMatrix in="SourceAlpha" result="hardAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" />
              <feOffset />
              <feGaussianBlur stdDeviation="22" />
              <feComposite in2="hardAlpha" operator="out" />
              <feColorMatrix type="matrix" values="0 0 0 0 1 0 0 0 0 0.705882 0 0 0 0 0.196078 0 0 0 0.7 0" />
              <feBlend in2="BackgroundImageFix" mode="normal" result="effect1_dropShadow_1_2664" />
              <feBlend in="SourceGraphic" in2="effect1_dropShadow_1_2664" mode="normal" result="shape" />
            </filter>
            <filter colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse" height="101" id="filter1_d_1_2664" width="173" x="-2" y="46">
              <feFlood floodOpacity="0" result="BackgroundImageFix" />
              <feColorMatrix in="SourceAlpha" result="hardAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" />
              <feOffset />
              <feGaussianBlur stdDeviation="6" />
              <feComposite in2="hardAlpha" operator="out" />
              <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.16 0" />
              <feBlend in2="BackgroundImageFix" mode="normal" result="effect1_dropShadow_1_2664" />
              <feBlend in="SourceGraphic" in2="effect1_dropShadow_1_2664" mode="normal" result="shape" />
            </filter>
            <clipPath id="bgblur_0_1_2664_clip_path" transform="translate(2 -46)">
              <path d={svgPaths.p14ae7680} />
            </clipPath>
            <linearGradient gradientUnits="userSpaceOnUse" id="paint0_linear_1_2664" x1="85" x2="85" y1="44" y2="94">
              <stop stopColor="#FFB432" />
              <stop offset="1" stopColor="#FE4C00" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    </div>
  );
}

function InfromationKWh() {
  return (
    <div className="absolute bg-white content-stretch flex items-end justify-between left-[22px] px-[16px] py-[20px] rounded-[24px] shadow-[0px_0px_24px_0px_rgba(0,0,0,0.08)] top-[167px] w-[331px]" data-name="Infromation KWh">
      <InfoCardContainer />
      <InfoCardImageContainer />
    </div>
  );
}

function Badge() {
  return (
    <div className="content-stretch flex items-center px-[12px] py-[8px] relative rounded-[16px] shadow-[0px_0px_24px_0px_rgba(0,0,0,0.12)] shrink-0" data-name="Badge" style={{ backgroundImage: "linear-gradient(163.817deg, rgb(32, 32, 45) 1.2863%, rgb(16, 16, 19) 103.1%)" }}>
      <p className="css-ew64yg font-['SF_Pro_Display:Semibold',sans-serif] leading-[20px] not-italic relative shrink-0 text-[15px] text-center text-white tracking-[-0.5px]">Living Room</p>
    </div>
  );
}

function Badge1() {
  return (
    <div className="bg-white content-stretch flex items-center px-[12px] py-[8px] relative rounded-[16px] shrink-0" data-name="Badge">
      <p className="css-ew64yg font-['SF_Pro_Display:Regular',sans-serif] leading-[20px] not-italic relative shrink-0 text-[15px] text-[rgba(4,4,21,0.6)] text-center tracking-[-0.24px]">Bedroom</p>
    </div>
  );
}

function Badge2() {
  return (
    <div className="bg-white content-stretch flex items-center px-[12px] py-[8px] relative rounded-[16px] shrink-0" data-name="Badge">
      <p className="css-ew64yg font-['SF_Pro_Display:Regular',sans-serif] leading-[20px] not-italic relative shrink-0 text-[15px] text-[rgba(4,4,21,0.6)] text-center tracking-[-0.24px]">Kitchen</p>
    </div>
  );
}

function Badge3() {
  return (
    <div className="bg-white content-stretch flex items-center px-[12px] py-[8px] relative rounded-[16px] shrink-0" data-name="Badge">
      <p className="css-ew64yg font-['SF_Pro_Display:Regular',sans-serif] leading-[20px] not-italic relative shrink-0 text-[15px] text-[rgba(4,4,21,0.6)] text-center tracking-[-0.24px]">Bathroom</p>
    </div>
  );
}

function Tab() {
  return (
    <div className="content-stretch flex gap-[8px] items-start relative shrink-0 w-full" data-name="Tab">
      <Badge />
      <Badge1 />
      <Badge2 />
      <Badge3 />
    </div>
  );
}

function CardImage() {
  return (
    <div className="absolute left-[-27px] size-[117px] top-[-27px]" data-name="Card Image">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 117 117">
        <g id="Card Image">
          <g id="Ellipse 8">
            <circle cx="58.5" cy="58.5" r="58.25" stroke="url(#paint0_linear_1_2625)" strokeOpacity="0.1" strokeWidth="0.5" />
            <circle cx="58.5" cy="58.5" r="58.25" stroke="url(#paint1_linear_1_2625)" strokeOpacity="0.1" strokeWidth="0.5" />
          </g>
          <g id="Ellipse 9">
            <circle cx="58.875" cy="58.875" r="43.625" stroke="url(#paint2_linear_1_2625)" strokeOpacity="0.1" strokeWidth="0.5" />
            <circle cx="58.875" cy="58.875" r="43.625" stroke="url(#paint3_linear_1_2625)" strokeOpacity="0.1" strokeWidth="0.5" />
          </g>
          <g id="Ellipse 10">
            <circle cx="58.9062" cy="58.9062" r="32.6562" stroke="url(#paint4_linear_1_2625)" strokeOpacity="0.1" strokeWidth="0.5" />
            <circle cx="58.9062" cy="58.9062" r="32.6562" stroke="url(#paint5_linear_1_2625)" strokeOpacity="0.1" strokeWidth="0.5" />
          </g>
          <g id="Ellipse 11">
            <circle cx="58.6797" cy="58.6797" r="24.4297" stroke="url(#paint6_linear_1_2625)" strokeOpacity="0.1" strokeWidth="0.5" />
            <circle cx="58.6797" cy="58.6797" r="24.4297" stroke="url(#paint7_linear_1_2625)" strokeOpacity="0.1" strokeWidth="0.5" />
          </g>
        </g>
        <defs>
          <linearGradient gradientUnits="userSpaceOnUse" id="paint0_linear_1_2625" x1="58.5" x2="58.5" y1="0" y2="117">
            <stop stopColor="white" />
            <stop offset="1" stopColor="#343434" />
          </linearGradient>
          <linearGradient gradientUnits="userSpaceOnUse" id="paint1_linear_1_2625" x1="58.5" x2="58.5" y1="0" y2="117">
            <stop stopColor="white" />
            <stop offset="1" stopColor="#343434" />
          </linearGradient>
          <linearGradient gradientUnits="userSpaceOnUse" id="paint2_linear_1_2625" x1="58.875" x2="58.875" y1="15" y2="102.75">
            <stop stopColor="white" />
            <stop offset="1" stopColor="#343434" />
          </linearGradient>
          <linearGradient gradientUnits="userSpaceOnUse" id="paint3_linear_1_2625" x1="58.875" x2="58.875" y1="15" y2="102.75">
            <stop stopColor="white" />
            <stop offset="1" stopColor="#343434" />
          </linearGradient>
          <linearGradient gradientUnits="userSpaceOnUse" id="paint4_linear_1_2625" x1="58.9062" x2="58.9062" y1="26" y2="91.8125">
            <stop stopColor="white" />
            <stop offset="1" stopColor="#343434" />
          </linearGradient>
          <linearGradient gradientUnits="userSpaceOnUse" id="paint5_linear_1_2625" x1="58.9062" x2="58.9062" y1="26" y2="91.8125">
            <stop stopColor="white" />
            <stop offset="1" stopColor="#343434" />
          </linearGradient>
          <linearGradient gradientUnits="userSpaceOnUse" id="paint6_linear_1_2625" x1="58.6797" x2="58.6797" y1="34" y2="83.3594">
            <stop stopColor="white" />
            <stop offset="1" stopColor="#343434" />
          </linearGradient>
          <linearGradient gradientUnits="userSpaceOnUse" id="paint7_linear_1_2625" x1="58.6797" x2="58.6797" y1="34" y2="83.3594">
            <stop stopColor="white" />
            <stop offset="1" stopColor="#343434" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

function VuesaxLinearLampCharge() {
  return (
    <div className="absolute contents inset-0" data-name="vuesax/linear/lamp-charge">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24">
        <g id="lamp-charge">
          <path d={svgPaths.p3c0b3100} id="Vector" stroke="var(--stroke-0, #040415)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
          <path d={svgPaths.p27b3edf2} id="Vector_2" stroke="var(--stroke-0, #040415)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
          <path d={svgPaths.p1c587a00} id="Vector_3" stroke="var(--stroke-0, #040415)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
          <g id="Vector_4" opacity="0" />
        </g>
      </svg>
    </div>
  );
}

function LampCharge() {
  return (
    <div className="relative shrink-0 size-[24px]" data-name="lamp-charge">
      <VuesaxLinearLampCharge />
    </div>
  );
}

function CardIcon() {
  return (
    <div className="bg-white content-stretch flex items-center justify-center p-[8px] relative rounded-[24px] shadow-[0px_0px_12px_0px_rgba(255,255,255,0.16)] shrink-0 w-[40px]" data-name="Card Icon">
      <LampCharge />
    </div>
  );
}

function VuesaxBulkBluetoothRectangle() {
  return (
    <div className="absolute contents inset-0" data-name="vuesax/bulk/bluetooth-rectangle">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24">
        <g id="bluetooth-rectangle">
          <path d="M23.5 0.5V23.5H0.5V0.5H23.5Z" id="Vector" opacity="0" stroke="var(--stroke-0, white)" strokeOpacity="0.2" />
          <g id="Vector_2" opacity="0.4">
            <path d={svgPaths.p2fff5f00} fill="var(--fill-0, white)" fillOpacity="0.2" />
            <path d={svgPaths.p3316f580} stroke="var(--stroke-0, white)" strokeOpacity="0.2" strokeWidth="1.5" />
          </g>
          <g id="Group">
            <path d={svgPaths.p166d2f00} fill="var(--fill-0, white)" fillOpacity="0.2" id="Vector_3" />
          </g>
        </g>
      </svg>
    </div>
  );
}

function BluetoothRectangle() {
  return (
    <div className="relative shrink-0 size-[24px]" data-name="bluetooth-rectangle">
      <VuesaxBulkBluetoothRectangle />
    </div>
  );
}

function CardHeader() {
  return (
    <div className="relative shrink-0 w-full" data-name="Card Header">
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex items-center justify-between pr-[4px] relative w-full">
          <CardIcon />
          <BluetoothRectangle />
        </div>
      </div>
    </div>
  );
}

function CardInfoContainer() {
  return (
    <div className="content-stretch flex flex-col gap-[6px] items-start relative shrink-0" data-name="Card Info Container">
      <p className="css-ew64yg font-['SF_Pro_Display:Semibold',sans-serif] leading-[22px] relative shrink-0 text-[17px] text-white tracking-[-0.408px]">Lighting</p>
      <p className="css-ew64yg font-['SF_Pro_Display:Regular',sans-serif] leading-[16px] relative shrink-0 text-[12px] text-[rgba(255,255,255,0.6)]">6 lamps</p>
    </div>
  );
}

function CardBody() {
  return (
    <div className="content-stretch flex gap-[24px] items-end justify-end not-italic relative shrink-0 text-center" data-name="Card Body">
      <CardInfoContainer />
      <p className="css-ew64yg font-['SF_Pro_Display:Regular',sans-serif] leading-[0] relative shrink-0 text-[0px] text-white">
        <span className="leading-[16px] text-[#65cf58] text-[12px]">12.5</span>
        <span className="leading-[16px] text-[12px]">{` `}</span>
        <span className="leading-[13px] text-[11px] text-[rgba(255,255,255,0.8)] tracking-[0.066px]">KW/h</span>
      </p>
    </div>
  );
}

function CardContent() {
  return (
    <div className="content-stretch flex flex-col gap-[12px] items-start relative shrink-0" data-name="Card Content">
      <CardHeader />
      <CardBody />
    </div>
  );
}

function Toggle() {
  return (
    <div className="h-[26px] relative shrink-0 w-[42.774px]" data-name="Toggle">
      <div className="absolute inset-[-9.68%_-11.76%_-29.03%_0]">
        <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 47.8064 36.0645">
          <g id="Toggle">
            <path clipRule="evenodd" d={svgPaths.p22644080} fill="var(--fill-0, white)" fillOpacity="0.6" fillRule="evenodd" id="Background" />
            <g filter="url(#filter0_dd_1_2652)" id="Knob">
              <path clipRule="evenodd" d={svgPaths.p2322680} fill="var(--fill-0, white)" fillRule="evenodd" />
            </g>
          </g>
          <defs>
            <filter colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse" height="36.0645" id="filter0_dd_1_2652" width="36.0645" x="11.7419" y="1.19209e-07">
              <feFlood floodOpacity="0" result="BackgroundImageFix" />
              <feColorMatrix in="SourceAlpha" result="hardAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" />
              <feOffset dy="2.51613" />
              <feGaussianBlur stdDeviation="0.419355" />
              <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.06 0" />
              <feBlend in2="BackgroundImageFix" mode="normal" result="effect1_dropShadow_1_2652" />
              <feColorMatrix in="SourceAlpha" result="hardAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" />
              <feOffset dy="2.51613" />
              <feGaussianBlur stdDeviation="3.35484" />
              <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.15 0" />
              <feBlend in2="effect1_dropShadow_1_2652" mode="normal" result="effect2_dropShadow_1_2652" />
              <feBlend in="SourceGraphic" in2="effect2_dropShadow_1_2652" mode="normal" result="shape" />
            </filter>
          </defs>
        </svg>
      </div>
    </div>
  );
}

function CardFooter() {
  return (
    <div className="content-stretch flex items-center justify-between relative shrink-0 w-full" data-name="Card Footer">
      <p className="css-ew64yg font-['SF_Pro_Display:Semibold',sans-serif] leading-[22px] not-italic relative shrink-0 text-[17px] text-center text-white tracking-[-0.408px]">On</p>
      <Toggle />
    </div>
  );
}

function Card() {
  return (
    <div className="absolute content-stretch flex flex-col gap-[20px] items-center left-0 p-[12px] shadow-[0px_0px_24px_0px_rgba(0,0,0,0.08)] top-0" data-name="Card">
      <CardContent />
      <div className="h-0 relative shrink-0 w-full">
        <div className="absolute inset-[-0.5px_-0.38%]">
          <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 134 1">
            <path d="M0.5 0.5H133.5" id="Line 1" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeOpacity="0.1" />
          </svg>
        </div>
      </div>
      <CardFooter />
    </div>
  );
}

function CardContainer() {
  return (
    <div className="h-[186px] overflow-clip relative rounded-[20px] shrink-0 w-[157px]" data-name="Card Container" style={{ backgroundImage: "linear-gradient(136.033deg, rgb(32, 32, 45) 1.2863%, rgb(16, 16, 19) 103.1%)" }}>
      <CardImage />
      <Card />
    </div>
  );
}

function CardImage1() {
  return (
    <div className="absolute left-[-27px] size-[117px] top-[-27px]" data-name="Card Image">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 117 117">
        <g id="Card Image">
          <circle cx="58.5" cy="58.5" id="Ellipse 8" r="58.25" stroke="url(#paint0_linear_1_2703)" strokeOpacity="0.1" strokeWidth="0.5" />
          <circle cx="58.875" cy="58.875" id="Ellipse 9" r="43.625" stroke="url(#paint1_linear_1_2703)" strokeOpacity="0.1" strokeWidth="0.5" />
          <circle cx="58.9062" cy="58.9062" id="Ellipse 10" r="32.6562" stroke="url(#paint2_linear_1_2703)" strokeOpacity="0.1" strokeWidth="0.5" />
          <circle cx="58.6797" cy="58.6797" id="Ellipse 11" r="24.4297" stroke="url(#paint3_linear_1_2703)" strokeOpacity="0.1" strokeWidth="0.5" />
        </g>
        <defs>
          <linearGradient gradientUnits="userSpaceOnUse" id="paint0_linear_1_2703" x1="58.5" x2="58.5" y1="0" y2="117">
            <stop stopColor="#040415" />
            <stop offset="1" stopColor="#BCBCBC" />
          </linearGradient>
          <linearGradient gradientUnits="userSpaceOnUse" id="paint1_linear_1_2703" x1="58.875" x2="58.875" y1="15" y2="102.75">
            <stop stopColor="#040415" />
            <stop offset="1" stopColor="#BCBCBC" />
          </linearGradient>
          <linearGradient gradientUnits="userSpaceOnUse" id="paint2_linear_1_2703" x1="58.9062" x2="58.9062" y1="26" y2="91.8125">
            <stop stopColor="#040415" />
            <stop offset="1" stopColor="#BCBCBC" />
          </linearGradient>
          <linearGradient gradientUnits="userSpaceOnUse" id="paint3_linear_1_2703" x1="58.6797" x2="58.6797" y1="34" y2="83.3594">
            <stop stopColor="#040415" />
            <stop offset="1" stopColor="#BCBCBC" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

function VuesaxLinearMonitor() {
  return (
    <div className="absolute contents inset-0" data-name="vuesax/linear/monitor">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24">
        <g id="monitor">
          <path d={svgPaths.p26baae80} id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
          <path d="M12 17.22V22" id="Vector_2" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
          <path d="M2 13H22" id="Vector_3" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
          <path d="M7.5 22H16.5" id="Vector_4" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
          <g id="Vector_5" opacity="0" />
        </g>
      </svg>
    </div>
  );
}

function Monitor() {
  return (
    <div className="relative shrink-0 size-[24px]" data-name="monitor">
      <VuesaxLinearMonitor />
    </div>
  );
}

function CardIcon1() {
  return (
    <div className="content-stretch flex items-center justify-center p-[8px] relative rounded-[24px] shrink-0 w-[40px]" data-name="Card Icon" style={{ backgroundImage: "linear-gradient(140.848deg, rgb(32, 32, 45) 1.2863%, rgb(16, 16, 19) 103.1%)" }}>
      <Monitor />
    </div>
  );
}

function VuesaxBulkBluetoothRectangle1() {
  return (
    <div className="absolute contents inset-0" data-name="vuesax/bulk/bluetooth-rectangle">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24">
        <g id="bluetooth-rectangle">
          <path d="M23.5 0.5V23.5H0.5V0.5H23.5Z" id="Vector" opacity="0" stroke="var(--stroke-0, #040415)" strokeOpacity="0.2" />
          <g id="Vector_2" opacity="0.4">
            <path d={svgPaths.p2fff5f00} fill="var(--fill-0, #040415)" fillOpacity="0.2" />
            <path d={svgPaths.p3316f580} stroke="var(--stroke-0, #040415)" strokeOpacity="0.2" strokeWidth="1.5" />
          </g>
          <g id="Group">
            <path d={svgPaths.p166d2f00} fill="var(--fill-0, #040415)" fillOpacity="0.2" id="Vector_3" />
          </g>
        </g>
      </svg>
    </div>
  );
}

function BluetoothRectangle1() {
  return (
    <div className="relative shrink-0 size-[24px]" data-name="bluetooth-rectangle">
      <VuesaxBulkBluetoothRectangle1 />
    </div>
  );
}

function CardHeader1() {
  return (
    <div className="relative shrink-0 w-full" data-name="Card Header">
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex items-center justify-between pr-[4px] relative w-full">
          <CardIcon1 />
          <BluetoothRectangle1 />
        </div>
      </div>
    </div>
  );
}

function CardInfoContainer1() {
  return (
    <div className="content-stretch flex flex-col gap-[6px] items-start relative shrink-0" data-name="Card Info Container">
      <p className="css-ew64yg font-['SF_Pro_Display:Semibold',sans-serif] leading-[22px] relative shrink-0 text-[#040415] text-[17px] tracking-[-0.408px]">Smart TV</p>
      <p className="css-ew64yg font-['SF_Pro_Display:Regular',sans-serif] leading-[16px] relative shrink-0 text-[12px] text-[rgba(4,4,21,0.4)]">1 Smart TV</p>
    </div>
  );
}

function CardBody1() {
  return (
    <div className="content-stretch flex items-end justify-between not-italic relative shrink-0 text-center w-full" data-name="Card Body">
      <CardInfoContainer1 />
      <p className="css-ew64yg font-['SF_Pro_Display:Regular',sans-serif] leading-[0] relative shrink-0 text-[#040415] text-[0px]">
        <span className="leading-[16px] text-[#65cf58] text-[12px]">17.5</span>
        <span className="leading-[16px] text-[12px]">{` `}</span>
        <span className="leading-[13px] text-[11px] text-[rgba(4,4,21,0.8)] tracking-[0.066px]">KW/h</span>
      </p>
    </div>
  );
}

function CardContent1() {
  return (
    <div className="content-stretch flex flex-col gap-[12px] items-start relative shrink-0 w-full" data-name="Card Content">
      <CardHeader1 />
      <CardBody1 />
    </div>
  );
}

function Toggle1() {
  return (
    <div className="h-[26px] relative shrink-0 w-[42.774px]" data-name="Toggle">
      <div className="absolute inset-[-9.68%_0_-29.03%_-12.29%]">
        <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 48.0323 36.0645">
          <g id="Toggle">
            <path clipRule="evenodd" d={svgPaths.p6e57c0} fill="url(#paint0_linear_1_2633)" fillRule="evenodd" id="Background" />
            <g filter="url(#filter0_dd_1_2633)" id="Knob">
              <path clipRule="evenodd" d={svgPaths.p19886980} fill="var(--fill-0, white)" fillRule="evenodd" />
            </g>
          </g>
          <defs>
            <filter colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse" height="36.0645" id="filter0_dd_1_2633" width="36.0645" x="0" y="0">
              <feFlood floodOpacity="0" result="BackgroundImageFix" />
              <feColorMatrix in="SourceAlpha" result="hardAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" />
              <feOffset dy="2.51613" />
              <feGaussianBlur stdDeviation="0.419355" />
              <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.06 0" />
              <feBlend in2="BackgroundImageFix" mode="normal" result="effect1_dropShadow_1_2633" />
              <feColorMatrix in="SourceAlpha" result="hardAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" />
              <feOffset dy="2.51613" />
              <feGaussianBlur stdDeviation="3.35484" />
              <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.15 0" />
              <feBlend in2="effect1_dropShadow_1_2633" mode="normal" result="effect2_dropShadow_1_2633" />
              <feBlend in="SourceGraphic" in2="effect2_dropShadow_1_2633" mode="normal" result="shape" />
            </filter>
            <linearGradient gradientUnits="userSpaceOnUse" id="paint0_linear_1_2633" x1="4.03213" x2="23.605" y1="2.51612" y2="42.0658">
              <stop stopColor="#20202D" />
              <stop offset="1" stopColor="#101013" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    </div>
  );
}

function CardFooter1() {
  return (
    <div className="content-stretch flex items-center justify-between relative shrink-0 w-full" data-name="Card Footer">
      <p className="css-ew64yg font-['SF_Pro_Display:Semibold',sans-serif] leading-[22px] not-italic relative shrink-0 text-[#040415] text-[17px] text-center tracking-[-0.408px]">Off</p>
      <Toggle1 />
    </div>
  );
}

function Card1() {
  return (
    <div className="absolute content-stretch flex flex-col gap-[20px] items-center left-0 p-[12px] shadow-[0px_0px_24px_0px_rgba(0,0,0,0.08)] top-0 w-[157px]" data-name="Card">
      <CardContent1 />
      <div className="h-0 relative shrink-0 w-full">
        <div className="absolute inset-[-0.5px_-0.38%]">
          <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 134 1">
            <path d="M0.5 0.5H133.5" id="Line 1" stroke="var(--stroke-0, #040415)" strokeLinecap="round" strokeOpacity="0.1" />
          </svg>
        </div>
      </div>
      <CardFooter1 />
    </div>
  );
}

function CardContainer1() {
  return (
    <div className="h-[186px] overflow-clip relative rounded-[20px] shadow-[0px_0px_36px_0px_rgba(0,0,0,0.2)] shrink-0 w-[157px]" data-name="Card Container" style={{ backgroundImage: "linear-gradient(136.033deg, rgb(255, 255, 255) 1.2863%, rgb(246, 246, 246) 103.1%)" }}>
      <CardImage1 />
      <Card1 />
    </div>
  );
}

function CardImage2() {
  return (
    <div className="absolute left-[-27px] size-[117px] top-[-27px]" data-name="Card Image">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 117 117">
        <g id="Card Image">
          <circle cx="58.5" cy="58.5" id="Ellipse 8" r="58.25" stroke="url(#paint0_linear_1_2703)" strokeOpacity="0.1" strokeWidth="0.5" />
          <circle cx="58.875" cy="58.875" id="Ellipse 9" r="43.625" stroke="url(#paint1_linear_1_2703)" strokeOpacity="0.1" strokeWidth="0.5" />
          <circle cx="58.9062" cy="58.9062" id="Ellipse 10" r="32.6562" stroke="url(#paint2_linear_1_2703)" strokeOpacity="0.1" strokeWidth="0.5" />
          <circle cx="58.6797" cy="58.6797" id="Ellipse 11" r="24.4297" stroke="url(#paint3_linear_1_2703)" strokeOpacity="0.1" strokeWidth="0.5" />
        </g>
        <defs>
          <linearGradient gradientUnits="userSpaceOnUse" id="paint0_linear_1_2703" x1="58.5" x2="58.5" y1="0" y2="117">
            <stop stopColor="#040415" />
            <stop offset="1" stopColor="#BCBCBC" />
          </linearGradient>
          <linearGradient gradientUnits="userSpaceOnUse" id="paint1_linear_1_2703" x1="58.875" x2="58.875" y1="15" y2="102.75">
            <stop stopColor="#040415" />
            <stop offset="1" stopColor="#BCBCBC" />
          </linearGradient>
          <linearGradient gradientUnits="userSpaceOnUse" id="paint2_linear_1_2703" x1="58.9062" x2="58.9062" y1="26" y2="91.8125">
            <stop stopColor="#040415" />
            <stop offset="1" stopColor="#BCBCBC" />
          </linearGradient>
          <linearGradient gradientUnits="userSpaceOnUse" id="paint3_linear_1_2703" x1="58.6797" x2="58.6797" y1="34" y2="83.3594">
            <stop stopColor="#040415" />
            <stop offset="1" stopColor="#BCBCBC" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

function LucideCctv() {
  return (
    <div className="relative shrink-0 size-[24px]" data-name="lucide:cctv">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24">
        <g id="lucide:cctv">
          <path d={svgPaths.p4bbe300} id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function CardIcon2() {
  return (
    <div className="content-stretch flex items-center justify-center p-[8px] relative rounded-[24px] shrink-0 w-[40px]" data-name="Card Icon" style={{ backgroundImage: "linear-gradient(140.848deg, rgb(32, 32, 45) 1.2863%, rgb(16, 16, 19) 103.1%)" }}>
      <LucideCctv />
    </div>
  );
}

function Group1() {
  return (
    <div className="absolute inset-[29.57%_21.87%_55.37%_21.9%]" data-name="Group">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 13.4966 3.6125">
        <g id="Group">
          <path d={svgPaths.p2ba29780} fill="var(--fill-0, #040415)" fillOpacity="0.2" id="Vector" />
        </g>
      </svg>
    </div>
  );
}

function Group2() {
  return (
    <div className="absolute inset-[44.79%_28.58%_42.5%_28.52%]" data-name="Group">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 10.2966 3.05">
        <g id="Group">
          <path d={svgPaths.p3341fc00} fill="var(--fill-0, #040415)" fillOpacity="0.2" id="Vector" />
        </g>
      </svg>
    </div>
  );
}

function Group3() {
  return (
    <div className="absolute inset-[60.95%_37.74%_29.63%_37.69%]" data-name="Group">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 5.89662 2.2625">
        <g id="Group">
          <path d={svgPaths.p2bfd7780} fill="var(--fill-0, #040415)" fillOpacity="0.2" id="Vector" />
        </g>
      </svg>
    </div>
  );
}

function Group() {
  return (
    <div className="absolute contents inset-[29.57%_21.87%_29.63%_21.9%]" data-name="Group">
      <Group1 />
      <Group2 />
      <Group3 />
    </div>
  );
}

function WifiSquare1() {
  return (
    <div className="absolute contents inset-0" data-name="wifi-square">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 32 32">
        <path d="M23.5 0.5V23.5H0.5V0.5H23.5Z" id="Vector" opacity="0" stroke="var(--stroke-0, #040415)" strokeOpacity="0.2" />
      </svg>
      <div className="absolute inset-[8.33%_8.37%_8.38%_8.33%]" data-name="Vector">
        <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 19.99 19.99">
          <g id="Vector" opacity="0.4">
            <path d={svgPaths.p32baa800} fill="var(--fill-0, #040415)" fillOpacity="0.2" />
            <path d={svgPaths.p356b8300} stroke="var(--stroke-0, #040415)" strokeOpacity="0.2" strokeWidth="1.5" />
          </g>
        </svg>
      </div>
      <Group />
    </div>
  );
}

function VuesaxBulkWifiSquare() {
  return (
    <div className="absolute contents inset-0" data-name="vuesax/bulk/wifi-square">
      <WifiSquare1 />
    </div>
  );
}

function WifiSquare() {
  return (
    <div className="relative shrink-0 size-[24px]" data-name="wifi-square">
      <VuesaxBulkWifiSquare />
    </div>
  );
}

function CardHeader2() {
  return (
    <div className="relative shrink-0 w-full" data-name="Card Header">
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex items-center justify-between pr-[4px] relative w-full">
          <CardIcon2 />
          <WifiSquare />
        </div>
      </div>
    </div>
  );
}

function CardInfoContainer2() {
  return (
    <div className="content-stretch flex flex-col gap-[6px] items-start relative shrink-0" data-name="Card Info Container">
      <p className="css-ew64yg font-['SF_Pro_Display:Semibold',sans-serif] leading-[22px] relative shrink-0 text-[#040415] text-[17px] tracking-[-0.408px]">CCTV</p>
      <p className="css-ew64yg font-['SF_Pro_Display:Regular',sans-serif] leading-[16px] relative shrink-0 text-[12px] text-[rgba(4,4,21,0.4)]">1 CCTV</p>
    </div>
  );
}

function CardBody2() {
  return (
    <div className="content-stretch flex items-end justify-between not-italic relative shrink-0 text-center w-full" data-name="Card Body">
      <CardInfoContainer2 />
      <p className="css-ew64yg font-['SF_Pro_Display:Regular',sans-serif] leading-[0] relative shrink-0 text-[#040415] text-[0px]">
        <span className="leading-[16px] text-[#65cf58] text-[12px]">17.5</span>
        <span className="leading-[16px] text-[12px]">{` `}</span>
        <span className="leading-[13px] text-[11px] text-[rgba(4,4,21,0.8)] tracking-[0.066px]">KW/h</span>
      </p>
    </div>
  );
}

function CardContent2() {
  return (
    <div className="content-stretch flex flex-col gap-[12px] items-start relative shrink-0 w-full" data-name="Card Content">
      <CardHeader2 />
      <CardBody2 />
    </div>
  );
}

function Toggle2() {
  return (
    <div className="h-[26px] relative shrink-0 w-[42.774px]" data-name="Toggle">
      <div className="absolute inset-[-9.68%_0_-29.03%_-12.29%]">
        <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 48.0323 36.0645">
          <g id="Toggle">
            <path clipRule="evenodd" d={svgPaths.p6e57c0} fill="url(#paint0_linear_1_2604)" fillRule="evenodd" id="Background" />
            <g filter="url(#filter0_dd_1_2604)" id="Knob">
              <path clipRule="evenodd" d={svgPaths.p19886980} fill="var(--fill-0, white)" fillRule="evenodd" />
            </g>
          </g>
          <defs>
            <filter colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse" height="36.0645" id="filter0_dd_1_2604" width="36.0645" x="0" y="0">
              <feFlood floodOpacity="0" result="BackgroundImageFix" />
              <feColorMatrix in="SourceAlpha" result="hardAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" />
              <feOffset dy="2.51613" />
              <feGaussianBlur stdDeviation="0.419355" />
              <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.06 0" />
              <feBlend in2="BackgroundImageFix" mode="normal" result="effect1_dropShadow_1_2604" />
              <feColorMatrix in="SourceAlpha" result="hardAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" />
              <feOffset dy="2.51613" />
              <feGaussianBlur stdDeviation="3.35484" />
              <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.15 0" />
              <feBlend in2="effect1_dropShadow_1_2604" mode="normal" result="effect2_dropShadow_1_2604" />
              <feBlend in="SourceGraphic" in2="effect2_dropShadow_1_2604" mode="normal" result="shape" />
            </filter>
            <linearGradient gradientUnits="userSpaceOnUse" id="paint0_linear_1_2604" x1="4.03213" x2="23.605" y1="2.51612" y2="42.0658">
              <stop stopColor="#20202D" />
              <stop offset="1" stopColor="#101013" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    </div>
  );
}

function CardFooter2() {
  return (
    <div className="content-stretch flex items-center justify-between relative shrink-0 w-full" data-name="Card Footer">
      <p className="css-ew64yg font-['SF_Pro_Display:Semibold',sans-serif] leading-[22px] not-italic relative shrink-0 text-[#040415] text-[17px] text-center tracking-[-0.408px]">Off</p>
      <Toggle2 />
    </div>
  );
}

function Card2() {
  return (
    <div className="absolute content-stretch flex flex-col gap-[20px] items-center left-0 p-[12px] shadow-[0px_0px_24px_0px_rgba(0,0,0,0.08)] top-0 w-[157px]" data-name="Card">
      <CardContent2 />
      <div className="h-0 relative shrink-0 w-full">
        <div className="absolute inset-[-0.5px_-0.38%]">
          <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 134 1">
            <path d="M0.5 0.5H133.5" id="Line 1" stroke="var(--stroke-0, #040415)" strokeLinecap="round" strokeOpacity="0.1" />
          </svg>
        </div>
      </div>
      <CardFooter2 />
    </div>
  );
}

function CardContainer2() {
  return (
    <div className="h-[186px] overflow-clip relative rounded-[20px] shadow-[0px_0px_36px_0px_rgba(0,0,0,0.2)] shrink-0 w-[157px]" data-name="Card Container" style={{ backgroundImage: "linear-gradient(136.033deg, rgb(255, 255, 255) 1.2863%, rgb(246, 246, 246) 103.1%)" }}>
      <CardImage2 />
      <Card2 />
    </div>
  );
}

function CardImage3() {
  return (
    <div className="absolute left-[-27px] size-[117px] top-[-27px]" data-name="Card Image">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 117 117">
        <g id="Card Image">
          <g id="Ellipse 8">
            <circle cx="58.5" cy="58.5" r="58.25" stroke="url(#paint0_linear_1_2625)" strokeOpacity="0.1" strokeWidth="0.5" />
            <circle cx="58.5" cy="58.5" r="58.25" stroke="url(#paint1_linear_1_2625)" strokeOpacity="0.1" strokeWidth="0.5" />
          </g>
          <g id="Ellipse 9">
            <circle cx="58.875" cy="58.875" r="43.625" stroke="url(#paint2_linear_1_2625)" strokeOpacity="0.1" strokeWidth="0.5" />
            <circle cx="58.875" cy="58.875" r="43.625" stroke="url(#paint3_linear_1_2625)" strokeOpacity="0.1" strokeWidth="0.5" />
          </g>
          <g id="Ellipse 10">
            <circle cx="58.9062" cy="58.9062" r="32.6562" stroke="url(#paint4_linear_1_2625)" strokeOpacity="0.1" strokeWidth="0.5" />
            <circle cx="58.9062" cy="58.9062" r="32.6562" stroke="url(#paint5_linear_1_2625)" strokeOpacity="0.1" strokeWidth="0.5" />
          </g>
          <g id="Ellipse 11">
            <circle cx="58.6797" cy="58.6797" r="24.4297" stroke="url(#paint6_linear_1_2625)" strokeOpacity="0.1" strokeWidth="0.5" />
            <circle cx="58.6797" cy="58.6797" r="24.4297" stroke="url(#paint7_linear_1_2625)" strokeOpacity="0.1" strokeWidth="0.5" />
          </g>
        </g>
        <defs>
          <linearGradient gradientUnits="userSpaceOnUse" id="paint0_linear_1_2625" x1="58.5" x2="58.5" y1="0" y2="117">
            <stop stopColor="white" />
            <stop offset="1" stopColor="#343434" />
          </linearGradient>
          <linearGradient gradientUnits="userSpaceOnUse" id="paint1_linear_1_2625" x1="58.5" x2="58.5" y1="0" y2="117">
            <stop stopColor="white" />
            <stop offset="1" stopColor="#343434" />
          </linearGradient>
          <linearGradient gradientUnits="userSpaceOnUse" id="paint2_linear_1_2625" x1="58.875" x2="58.875" y1="15" y2="102.75">
            <stop stopColor="white" />
            <stop offset="1" stopColor="#343434" />
          </linearGradient>
          <linearGradient gradientUnits="userSpaceOnUse" id="paint3_linear_1_2625" x1="58.875" x2="58.875" y1="15" y2="102.75">
            <stop stopColor="white" />
            <stop offset="1" stopColor="#343434" />
          </linearGradient>
          <linearGradient gradientUnits="userSpaceOnUse" id="paint4_linear_1_2625" x1="58.9062" x2="58.9062" y1="26" y2="91.8125">
            <stop stopColor="white" />
            <stop offset="1" stopColor="#343434" />
          </linearGradient>
          <linearGradient gradientUnits="userSpaceOnUse" id="paint5_linear_1_2625" x1="58.9062" x2="58.9062" y1="26" y2="91.8125">
            <stop stopColor="white" />
            <stop offset="1" stopColor="#343434" />
          </linearGradient>
          <linearGradient gradientUnits="userSpaceOnUse" id="paint6_linear_1_2625" x1="58.6797" x2="58.6797" y1="34" y2="83.3594">
            <stop stopColor="white" />
            <stop offset="1" stopColor="#343434" />
          </linearGradient>
          <linearGradient gradientUnits="userSpaceOnUse" id="paint7_linear_1_2625" x1="58.6797" x2="58.6797" y1="34" y2="83.3594">
            <stop stopColor="white" />
            <stop offset="1" stopColor="#343434" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

function VuesaxLinearWind() {
  return (
    <div className="absolute contents inset-0" data-name="vuesax/linear/wind">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24">
        <g id="wind">
          <path d={svgPaths.p23051580} id="Vector" stroke="var(--stroke-0, #040415)" strokeLinecap="round" strokeLinejoin="round" strokeMiterlimit="10" strokeWidth="1.5" />
          <path d={svgPaths.p21497400} id="Vector_2" stroke="var(--stroke-0, #040415)" strokeLinecap="round" strokeLinejoin="round" strokeMiterlimit="10" strokeWidth="1.5" />
          <path d={svgPaths.p33e6e100} id="Vector_3" stroke="var(--stroke-0, #040415)" strokeLinecap="round" strokeLinejoin="round" strokeMiterlimit="10" strokeWidth="1.5" />
          <g id="Vector_4" opacity="0" />
        </g>
      </svg>
    </div>
  );
}

function Wind() {
  return (
    <div className="relative shrink-0 size-[24px]" data-name="wind">
      <VuesaxLinearWind />
    </div>
  );
}

function CardIcon3() {
  return (
    <div className="bg-white content-stretch flex items-center justify-center p-[8px] relative rounded-[24px] shadow-[0px_0px_12px_0px_rgba(255,255,255,0.16)] shrink-0 w-[40px]" data-name="Card Icon">
      <Wind />
    </div>
  );
}

function VuesaxBulkBluetoothRectangle2() {
  return (
    <div className="absolute contents inset-0" data-name="vuesax/bulk/bluetooth-rectangle">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24">
        <g id="bluetooth-rectangle">
          <path d="M23.5 0.5V23.5H0.5V0.5H23.5Z" id="Vector" opacity="0" stroke="var(--stroke-0, white)" strokeOpacity="0.2" />
          <g id="Vector_2" opacity="0.4">
            <path d={svgPaths.p2fff5f00} fill="var(--fill-0, white)" fillOpacity="0.2" />
            <path d={svgPaths.p3316f580} stroke="var(--stroke-0, white)" strokeOpacity="0.2" strokeWidth="1.5" />
          </g>
          <g id="Group">
            <path d={svgPaths.p166d2f00} fill="var(--fill-0, white)" fillOpacity="0.2" id="Vector_3" />
          </g>
        </g>
      </svg>
    </div>
  );
}

function BluetoothRectangle2() {
  return (
    <div className="relative shrink-0 size-[24px]" data-name="bluetooth-rectangle">
      <VuesaxBulkBluetoothRectangle2 />
    </div>
  );
}

function CardHeader3() {
  return (
    <div className="relative shrink-0 w-full" data-name="Card Header">
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex items-center justify-between pr-[4px] relative w-full">
          <CardIcon3 />
          <BluetoothRectangle2 />
        </div>
      </div>
    </div>
  );
}

function CardInfoSubContainer() {
  return (
    <div className="content-stretch flex font-['SF_Pro_Display:Regular',sans-serif] items-start justify-between relative shrink-0 w-full" data-name="Card Info Sub-container">
      <p className="css-ew64yg leading-[16px] relative shrink-0 text-[12px] text-[rgba(255,255,255,0.6)]">6 lamps</p>
      <p className="css-ew64yg leading-[0] relative shrink-0 text-[0px] text-center text-white">
        <span className="leading-[16px] text-[#65cf58] text-[12px]">12.5</span>
        <span className="leading-[16px] text-[12px]">{` `}</span>
        <span className="leading-[13px] text-[11px] text-[rgba(255,255,255,0.8)] tracking-[0.066px]">KW/h</span>
      </p>
    </div>
  );
}

function CardInfoContainer3() {
  return (
    <div className="content-stretch flex flex-[1_0_0] flex-col gap-[6px] items-start min-h-px min-w-px not-italic relative" data-name="Card Info Container">
      <p className="css-ew64yg font-['SF_Pro_Display:Semibold',sans-serif] leading-[22px] relative shrink-0 text-[17px] text-center text-white tracking-[-0.408px]">Air Conditioning</p>
      <CardInfoSubContainer />
    </div>
  );
}

function CardBody3() {
  return (
    <div className="content-stretch flex items-start relative shrink-0 w-full" data-name="Card Body">
      <CardInfoContainer3 />
    </div>
  );
}

function CardContent3() {
  return (
    <div className="content-stretch flex flex-col gap-[12px] items-start relative shrink-0 w-full" data-name="Card Content">
      <CardHeader3 />
      <CardBody3 />
    </div>
  );
}

function Toggle3() {
  return (
    <div className="h-[26px] relative shrink-0 w-[42.774px]" data-name="Toggle">
      <div className="absolute inset-[-9.68%_-11.76%_-29.03%_0]">
        <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 47.8064 36.0645">
          <g id="Toggle">
            <path clipRule="evenodd" d={svgPaths.p22644080} fill="var(--fill-0, white)" fillOpacity="0.6" fillRule="evenodd" id="Background" />
            <g filter="url(#filter0_dd_1_2652)" id="Knob">
              <path clipRule="evenodd" d={svgPaths.p2322680} fill="var(--fill-0, white)" fillRule="evenodd" />
            </g>
          </g>
          <defs>
            <filter colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse" height="36.0645" id="filter0_dd_1_2652" width="36.0645" x="11.7419" y="1.19209e-07">
              <feFlood floodOpacity="0" result="BackgroundImageFix" />
              <feColorMatrix in="SourceAlpha" result="hardAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" />
              <feOffset dy="2.51613" />
              <feGaussianBlur stdDeviation="0.419355" />
              <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.06 0" />
              <feBlend in2="BackgroundImageFix" mode="normal" result="effect1_dropShadow_1_2652" />
              <feColorMatrix in="SourceAlpha" result="hardAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" />
              <feOffset dy="2.51613" />
              <feGaussianBlur stdDeviation="3.35484" />
              <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.15 0" />
              <feBlend in2="effect1_dropShadow_1_2652" mode="normal" result="effect2_dropShadow_1_2652" />
              <feBlend in="SourceGraphic" in2="effect2_dropShadow_1_2652" mode="normal" result="shape" />
            </filter>
          </defs>
        </svg>
      </div>
    </div>
  );
}

function CardFooter3() {
  return (
    <div className="content-stretch flex items-center justify-between relative shrink-0 w-full" data-name="Card Footer">
      <p className="css-ew64yg font-['SF_Pro_Display:Semibold',sans-serif] leading-[22px] not-italic relative shrink-0 text-[17px] text-center text-white tracking-[-0.408px]">On</p>
      <Toggle3 />
    </div>
  );
}

function Card3() {
  return (
    <div className="absolute content-stretch flex flex-col gap-[20px] items-center left-0 p-[12px] shadow-[0px_0px_24px_0px_rgba(0,0,0,0.08)] top-0 w-[157px]" data-name="Card">
      <CardContent3 />
      <div className="h-0 relative shrink-0 w-full">
        <div className="absolute inset-[-0.5px_-0.38%]">
          <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 134 1">
            <path d="M0.5 0.5H133.5" id="Line 1" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeOpacity="0.1" />
          </svg>
        </div>
      </div>
      <CardFooter3 />
    </div>
  );
}

function CardContainer3() {
  return (
    <div className="h-[186px] overflow-clip relative rounded-[20px] shrink-0 w-[157px]" data-name="Card Container" style={{ backgroundImage: "linear-gradient(136.033deg, rgb(32, 32, 45) 1.2863%, rgb(16, 16, 19) 103.1%)" }}>
      <CardImage3 />
      <Card3 />
    </div>
  );
}

function Container() {
  return (
    <div className="content-start flex flex-wrap gap-[17px] items-start justify-between relative shrink-0 w-[331px]" data-name="Container">
      <CardContainer />
      <CardContainer1 />
      <CardContainer2 />
      <CardContainer3 />
    </div>
  );
}

function Content() {
  return (
    <div className="absolute content-stretch flex flex-col gap-[20px] items-start left-[22px] top-[316px] w-[360px]" data-name="Content">
      <Tab />
      <Container />
    </div>
  );
}

function VuesaxBoldHome() {
  return (
    <div className="absolute contents inset-0" data-name="vuesax/bold/home">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24">
        <g id="home">
          <path d={svgPaths.p2a26d200} fill="url(#paint0_linear_1_2679)" id="Vector" />
          <g id="Vector_2" opacity="0" />
        </g>
        <defs>
          <linearGradient gradientUnits="userSpaceOnUse" id="paint0_linear_1_2679" x1="1.24704" x2="19.7243" y1="1.99998" y2="25.0837">
            <stop stopColor="#20202D" />
            <stop offset="1" stopColor="#101013" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

function Home() {
  return (
    <div className="relative shrink-0 size-[24px]" data-name="home">
      <VuesaxBoldHome />
    </div>
  );
}

function VuesaxLinearElementEqual() {
  return (
    <div className="absolute contents inset-0" data-name="vuesax/linear/element-equal">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24">
        <g id="element-equal">
          <path d={svgPaths.p1323280} id="Vector" stroke="url(#paint0_linear_1_2596)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
          <path d={svgPaths.p19c6f400} id="Vector_2" stroke="url(#paint1_linear_1_2596)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
          <path d={svgPaths.p2cf26380} id="Vector_3" stroke="url(#paint2_linear_1_2596)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
          <path d="M15 15.5H21" id="Vector_4" stroke="url(#paint3_linear_1_2596)" strokeLinecap="round" strokeWidth="1.5" />
          <path d="M15 19.5H21" id="Vector_5" stroke="url(#paint4_linear_1_2596)" strokeLinecap="round" strokeWidth="1.5" />
          <g id="Vector_6" opacity="0" />
        </g>
        <defs>
          <linearGradient gradientUnits="userSpaceOnUse" id="paint0_linear_1_2596" x1="13.2564" x2="21.1374" y1="2" y2="11.6798">
            <stop stopColor="#20202D" />
            <stop offset="1" stopColor="#101013" />
          </linearGradient>
          <linearGradient gradientUnits="userSpaceOnUse" id="paint1_linear_1_2596" x1="1.75637" x2="9.62642" y1="2" y2="11.6775">
            <stop stopColor="#20202D" />
            <stop offset="1" stopColor="#101013" />
          </linearGradient>
          <linearGradient gradientUnits="userSpaceOnUse" id="paint2_linear_1_2596" x1="1.75637" x2="9.63743" y1="13.5" y2="23.1798">
            <stop stopColor="#20202D" />
            <stop offset="1" stopColor="#101013" />
          </linearGradient>
          <linearGradient gradientUnits="userSpaceOnUse" id="paint3_linear_1_2596" x1="14.828" x2="15.0803" y1="15.5" y2="17.3595">
            <stop stopColor="#20202D" />
            <stop offset="1" stopColor="#101013" />
          </linearGradient>
          <linearGradient gradientUnits="userSpaceOnUse" id="paint4_linear_1_2596" x1="14.828" x2="15.0803" y1="19.5" y2="21.3595">
            <stop stopColor="#20202D" />
            <stop offset="1" stopColor="#101013" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

function ElementEqual() {
  return (
    <div className="relative shrink-0 size-[24px]" data-name="element-equal">
      <VuesaxLinearElementEqual />
    </div>
  );
}

function VuesaxLinearAdd() {
  return (
    <div className="absolute contents inset-0" data-name="vuesax/linear/add">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 32 32">
        <g id="add">
          <path d="M8 16H24" id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
          <path d="M16 24V8" id="Vector_2" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
          <g id="Vector_3" opacity="0" />
        </g>
      </svg>
    </div>
  );
}

function Add1() {
  return (
    <div className="relative shrink-0 size-[32px]" data-name="add">
      <VuesaxLinearAdd />
    </div>
  );
}

function Add() {
  return (
    <div className="content-stretch flex items-center justify-center p-[8px] relative rounded-[100px] shadow-[0px_0px_36px_0px_rgba(0,0,0,0.2)] shrink-0" data-name="Add" style={{ backgroundImage: "linear-gradient(140.848deg, rgb(32, 32, 45) 1.2863%, rgb(16, 16, 19) 103.1%)" }}>
      <Add1 />
    </div>
  );
}

function VuesaxLinearNotification() {
  return (
    <div className="absolute contents inset-0" data-name="vuesax/linear/notification">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24">
        <g id="notification">
          <path d={svgPaths.p2e393100} id="Vector" stroke="url(#paint0_linear_1_2590)" strokeLinecap="round" strokeMiterlimit="10" strokeWidth="1.5" />
          <path d={svgPaths.p3718def0} id="Vector_2" stroke="url(#paint1_linear_1_2590)" strokeLinecap="round" strokeLinejoin="round" strokeMiterlimit="10" strokeWidth="1.5" />
          <path d={svgPaths.p21656e00} id="Vector_3" stroke="url(#paint2_linear_1_2590)" strokeMiterlimit="10" strokeWidth="1.5" />
          <g id="Vector_4" opacity="0" />
        </g>
        <defs>
          <linearGradient gradientUnits="userSpaceOnUse" id="paint0_linear_1_2590" x1="3.51422" x2="19.2968" y1="2.91" y2="21.3439">
            <stop stopColor="#20202D" />
            <stop offset="1" stopColor="#101013" />
          </linearGradient>
          <linearGradient gradientUnits="userSpaceOnUse" id="paint1_linear_1_2590" x1="10.0639" x2="10.6783" y1="1.94" y2="4.15572">
            <stop stopColor="#20202D" />
            <stop offset="1" stopColor="#101013" />
          </linearGradient>
          <linearGradient gradientUnits="userSpaceOnUse" id="paint2_linear_1_2590" x1="8.84803" x2="10.8319" y1="19.06" y2="23.9334">
            <stop stopColor="#20202D" />
            <stop offset="1" stopColor="#101013" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

function Notification() {
  return (
    <div className="relative shrink-0 size-[24px]" data-name="notification">
      <VuesaxLinearNotification />
    </div>
  );
}

function VuesaxLinearSetting() {
  return (
    <div className="absolute contents inset-0" data-name="vuesax/linear/setting-2">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24">
        <g id="setting-2">
          <path d={svgPaths.p3cccb600} id="Vector" stroke="url(#paint0_linear_1_2585)" strokeLinecap="round" strokeLinejoin="round" strokeMiterlimit="10" strokeWidth="1.5" />
          <path d={svgPaths.p243d2300} id="Vector_2" stroke="url(#paint1_linear_1_2585)" strokeLinecap="round" strokeLinejoin="round" strokeMiterlimit="10" strokeWidth="1.5" />
          <g id="Vector_3" opacity="0" />
        </g>
        <defs>
          <linearGradient gradientUnits="userSpaceOnUse" id="paint0_linear_1_2585" x1="8.82803" x2="14.3911" y1="9" y2="15.8328">
            <stop stopColor="#20202D" />
            <stop offset="1" stopColor="#101013" />
          </linearGradient>
          <linearGradient gradientUnits="userSpaceOnUse" id="paint1_linear_1_2585" x1="1.42647" x2="18.6963" y1="2.5611" y2="25.0447">
            <stop stopColor="#20202D" />
            <stop offset="1" stopColor="#101013" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

function Setting() {
  return (
    <div className="relative shrink-0 size-[24px]" data-name="setting-2">
      <VuesaxLinearSetting />
    </div>
  );
}

function TabBar() {
  return (
    <div className="absolute bg-white bottom-[44px] content-stretch flex items-center justify-between left-[calc(50%-1px)] px-[24px] py-[6px] rounded-[32px] shadow-[0px_0px_50px_0px_rgba(0,0,0,0.24)] translate-x-[-50%] w-[332px]" data-name="Tab Bar">
      <Home />
      <ElementEqual />
      <Add />
      <Notification />
      <Setting />
    </div>
  );
}

export default function HomeScreen() {
  return (
    <div className="bg-white relative size-full" data-name="Home Screen">
      <StatusBar />
      <HomeIndicatorIPhone />
      <ShadowBg />
      <Header />
      <InfromationKWh />
      <Content />
      <TabBar />
    </div>
  );
}