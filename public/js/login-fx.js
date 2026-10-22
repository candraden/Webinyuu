/* Beruang login + kastil berjalan (latar). Butuh jQuery + TweenMax (tanpa MorphSVGPlugin). */
(function () {
if (typeof TweenMax === "undefined" || typeof jQuery === "undefined") return;
if (window.MorphSVGPlugin && window.gsap) gsap.registerPlugin(MorphSVGPlugin);
var $ = jQuery;
(function () {
var emailLabel = document.querySelector("#loginEmailLabel"),
  email = document.querySelector("#email"),
  passwordLabel = document.querySelector("#loginPasswordLabel"),
  password = document.querySelector("#password"),
  showPasswordCheck = document.querySelector("#showPasswordCheck"),
  showPasswordToggle = document.querySelector("#showPasswordToggle"),
  mySVG = document.querySelector(".svgContainer"),
  twoFingers = document.querySelector(".twoFingers"),
  armL = document.querySelector(".armL"),
  armR = document.querySelector(".armR"),
  eyeL = document.querySelector(".eyeL"),
  eyeR = document.querySelector(".eyeR"),
  nose = document.querySelector(".nose"),
  mouth = document.querySelector(".mouth"),
  mouthBG = document.querySelector(".mouthBG"),
  mouthSmallBG = document.querySelector(".mouthSmallBG"),
  mouthMediumBG = document.querySelector(".mouthMediumBG"),
  mouthLargeBG = document.querySelector(".mouthLargeBG"),
  mouthMaskPath = document.querySelector("#mouthMaskPath"),
  mouthOutline = document.querySelector(".mouthOutline"),
  tooth = document.querySelector(".tooth"),
  tongue = document.querySelector(".tongue"),
  chin = document.querySelector(".chin"),
  face = document.querySelector(".face"),
  eyebrow = document.querySelector(".eyebrow"),
  outerEarL = document.querySelector(".earL .outerEar"),
  outerEarR = document.querySelector(".earR .outerEar"),
  earHairL = document.querySelector(".earL .earHair"),
  earHairR = document.querySelector(".earR .earHair"),
  hair = document.querySelector(".hair"),
  bodyBG = document.querySelector(".bodyBGnormal"),
  bodyBGchanged = document.querySelector(".bodyBGchanged");
var activeElement,
  curEmailIndex,
  screenCenter,
  svgCoords,
  emailCoords,
  emailScrollMax,
  chinMin = 0.5,
  dFromC,
  mouthStatus = "small",
  blinking,
  eyeScale = 1,
  eyesCovered = false,
  showPasswordClicked = false;
var eyeLCoords,
  eyeRCoords,
  noseCoords,
  mouthCoords,
  eyeLAngle,
  eyeLX,
  eyeLY,
  eyeRAngle,
  eyeRX,
  eyeRY,
  noseAngle,
  noseX,
  noseY,
  mouthAngle,
  mouthX,
  mouthY,
  mouthR,
  chinX,
  chinY,
  chinS,
  faceX,
  faceY,
  faceSkew,
  eyebrowSkew,
  outerEarX,
  outerEarY,
  hairX,
  hairS;

// Ganti bentuk (mulut / badan) tanpa plugin MorphSVG: langsung tukar atribut path "d".
var bodyBGnormalD = bodyBG.getAttribute("d");
function mTo(t, d, v) {
  var to = v.morphSVG;
  if (!to) return;
  var dd = to === bodyBG ? bodyBGnormalD : to.getAttribute("d");
  [].concat(t).forEach(function (el) { el.setAttribute("d", dd); });
}

function calculateFaceMove(e) {
  var carPos = email.selectionEnd,
    div = document.createElement("div"),
    span = document.createElement("span"),
    copyStyle = getComputedStyle(email),
    caretCoords = {};
  if (carPos == null || carPos == 0) {
    // if browser doesn't support 'selectionEnd' property on input[type="email"], use 'value.length' property instead
    carPos = email.value.length;
  }
  [].forEach.call(copyStyle, function (prop) {
    div.style[prop] = copyStyle[prop];
  });
  div.style.position = "absolute";
  document.body.appendChild(div);
  div.textContent = email.value.substr(0, carPos);
  span.textContent = email.value.substr(carPos) || ".";
  div.appendChild(span);

  if (email.scrollWidth <= emailScrollMax) {
    caretCoords = getPosition(span);
    dFromC = screenCenter - (caretCoords.x + emailCoords.x);
    eyeLAngle = getAngle(
      eyeLCoords.x,
      eyeLCoords.y,
      emailCoords.x + caretCoords.x,
      emailCoords.y + 25
    );
    eyeRAngle = getAngle(
      eyeRCoords.x,
      eyeRCoords.y,
      emailCoords.x + caretCoords.x,
      emailCoords.y + 25
    );
    noseAngle = getAngle(
      noseCoords.x,
      noseCoords.y,
      emailCoords.x + caretCoords.x,
      emailCoords.y + 25
    );
    mouthAngle = getAngle(
      mouthCoords.x,
      mouthCoords.y,
      emailCoords.x + caretCoords.x,
      emailCoords.y + 25
    );
  } else {
    eyeLAngle = getAngle(
      eyeLCoords.x,
      eyeLCoords.y,
      emailCoords.x + emailScrollMax,
      emailCoords.y + 25
    );
    eyeRAngle = getAngle(
      eyeRCoords.x,
      eyeRCoords.y,
      emailCoords.x + emailScrollMax,
      emailCoords.y + 25
    );
    noseAngle = getAngle(
      noseCoords.x,
      noseCoords.y,
      emailCoords.x + emailScrollMax,
      emailCoords.y + 25
    );
    mouthAngle = getAngle(
      mouthCoords.x,
      mouthCoords.y,
      emailCoords.x + emailScrollMax,
      emailCoords.y + 25
    );
  }

  eyeLX = Math.cos(eyeLAngle) * 20;
  eyeLY = Math.sin(eyeLAngle) * 10;
  eyeRX = Math.cos(eyeRAngle) * 20;
  eyeRY = Math.sin(eyeRAngle) * 10;
  noseX = Math.cos(noseAngle) * 23;
  noseY = Math.sin(noseAngle) * 10;
  mouthX = Math.cos(mouthAngle) * 23;
  mouthY = Math.sin(mouthAngle) * 10;
  mouthR = Math.cos(mouthAngle) * 6;
  chinX = mouthX * 0.8;
  chinY = mouthY * 0.5;
  chinS = 1 - (dFromC * 0.15) / 100;
  if (chinS > 1) {
    chinS = 1 - (chinS - 1);
    if (chinS < chinMin) {
      chinS = chinMin;
    }
  }
  faceX = mouthX * 0.3;
  faceY = mouthY * 0.4;
  faceSkew = Math.cos(mouthAngle) * 5;
  eyebrowSkew = Math.cos(mouthAngle) * 25;
  outerEarX = Math.cos(mouthAngle) * 4;
  outerEarY = Math.cos(mouthAngle) * 5;
  hairX = Math.cos(mouthAngle) * 6;
  hairS = 1.2;

  TweenMax.to(eyeL, 1, { x: -eyeLX, y: -eyeLY, ease: Expo.easeOut });
  TweenMax.to(eyeR, 1, { x: -eyeRX, y: -eyeRY, ease: Expo.easeOut });
  TweenMax.to(nose, 1, {
    x: -noseX,
    y: -noseY,
    rotation: mouthR,
    transformOrigin: "center center",
    ease: Expo.easeOut
  });
  TweenMax.to(mouth, 1, {
    x: -mouthX,
    y: -mouthY,
    rotation: mouthR,
    transformOrigin: "center center",
    ease: Expo.easeOut
  });
  TweenMax.to(chin, 1, {
    x: -chinX,
    y: -chinY,
    scaleY: chinS,
    ease: Expo.easeOut
  });
  TweenMax.to(face, 1, {
    x: -faceX,
    y: -faceY,
    skewX: -faceSkew,
    transformOrigin: "center top",
    ease: Expo.easeOut
  });
  TweenMax.to(eyebrow, 1, {
    x: -faceX,
    y: -faceY,
    skewX: -eyebrowSkew,
    transformOrigin: "center top",
    ease: Expo.easeOut
  });
  TweenMax.to(outerEarL, 1, {
    x: outerEarX,
    y: -outerEarY,
    ease: Expo.easeOut
  });
  TweenMax.to(outerEarR, 1, { x: outerEarX, y: outerEarY, ease: Expo.easeOut });
  TweenMax.to(earHairL, 1, {
    x: -outerEarX,
    y: -outerEarY,
    ease: Expo.easeOut
  });
  TweenMax.to(earHairR, 1, { x: -outerEarX, y: outerEarY, ease: Expo.easeOut });
  TweenMax.to(hair, 1, {
    x: hairX,
    scaleY: hairS,
    transformOrigin: "center bottom",
    ease: Expo.easeOut
  });

  document.body.removeChild(div);
}

function onEmailInput(e) {
  calculateFaceMove(e);
  var value = email.value;
  curEmailIndex = value.length;

  // very crude email validation to trigger effects
  if (curEmailIndex > 0) {
    if (mouthStatus == "small") {
      mouthStatus = "medium";
      mTo([mouthBG, mouthOutline, mouthMaskPath], 1, {
        morphSVG: mouthMediumBG,
        shapeIndex: 8,
        ease: Expo.easeOut
      });
      TweenMax.to(tooth, 1, { x: 0, y: 0, ease: Expo.easeOut });
      TweenMax.to(tongue, 1, { x: 0, y: 1, ease: Expo.easeOut });
      TweenMax.to([eyeL, eyeR], 1, {
        scaleX: 0.85,
        scaleY: 0.85,
        ease: Expo.easeOut
      });
      eyeScale = 0.85;
    }
    if (value.includes("@")) {
      mouthStatus = "large";
      mTo([mouthBG, mouthOutline, mouthMaskPath], 1, {
        morphSVG: mouthLargeBG,
        ease: Expo.easeOut
      });
      TweenMax.to(tooth, 1, { x: 3, y: -2, ease: Expo.easeOut });
      TweenMax.to(tongue, 1, { y: 2, ease: Expo.easeOut });
      TweenMax.to([eyeL, eyeR], 1, {
        scaleX: 0.65,
        scaleY: 0.65,
        ease: Expo.easeOut,
        transformOrigin: "center center"
      });
      eyeScale = 0.65;
    } else {
      mouthStatus = "medium";
      mTo([mouthBG, mouthOutline, mouthMaskPath], 1, {
        morphSVG: mouthMediumBG,
        ease: Expo.easeOut
      });
      TweenMax.to(tooth, 1, { x: 0, y: 0, ease: Expo.easeOut });
      TweenMax.to(tongue, 1, { x: 0, y: 1, ease: Expo.easeOut });
      TweenMax.to([eyeL, eyeR], 1, {
        scaleX: 0.85,
        scaleY: 0.85,
        ease: Expo.easeOut
      });
      eyeScale = 0.85;
    }
  } else {
    mouthStatus = "small";
    mTo([mouthBG, mouthOutline, mouthMaskPath], 1, {
      morphSVG: mouthSmallBG,
      shapeIndex: 9,
      ease: Expo.easeOut
    });
    TweenMax.to(tooth, 1, { x: 0, y: 0, ease: Expo.easeOut });
    TweenMax.to(tongue, 1, { y: 0, ease: Expo.easeOut });
    TweenMax.to([eyeL, eyeR], 1, { scaleX: 1, scaleY: 1, ease: Expo.easeOut });
    eyeScale = 1;
  }
}

function onEmailFocus(e) {
  activeElement = "email";
  e.target.parentElement.classList.add("focusWithText");
  //stopBlinking();
  //calculateFaceMove();
  onEmailInput();
}

function onEmailBlur(e) {
  activeElement = null;
  setTimeout(function () {
    if (activeElement == "email") {
    } else {
      if (e.target.value == "") {
        e.target.parentElement.classList.remove("focusWithText");
      }
      //startBlinking();
      resetFace();
    }
  }, 100);
}

function onEmailLabelClick(e) {
  activeElement = "email";
}

function onPasswordFocus(e) {
  activeElement = "password";
  if (!eyesCovered) {
    coverEyes();
  }
}

function onPasswordBlur(e) {
  activeElement = null;
  setTimeout(function () {
    if (activeElement == "toggle" || activeElement == "password") {
    } else {
      uncoverEyes();
    }
  }, 100);
}

function onPasswordToggleFocus(e) {
  activeElement = "toggle";
  if (!eyesCovered) {
    coverEyes();
  }
}

function onPasswordToggleBlur(e) {
  activeElement = null;
  if (!showPasswordClicked) {
    setTimeout(function () {
      if (activeElement == "password" || activeElement == "toggle") {
      } else {
        uncoverEyes();
      }
    }, 100);
  }
}

function onPasswordToggleMouseDown(e) {
  showPasswordClicked = true;
}

function onPasswordToggleMouseUp(e) {
  showPasswordClicked = false;
}

function onPasswordToggleChange(e) {
  setTimeout(function () {
    // if checkbox is checked, show password
    if (e.target.checked) {
      password.type = "text";
      spreadFingers();

      // if checkbox is off, hide password
    } else {
      password.type = "password";
      closeFingers();
    }
  }, 100);
}

function onPasswordToggleClick(e) {
  //console.log("click: " + e.target.id);
  e.target.focus();
}

function spreadFingers() {
  TweenMax.to(twoFingers, 0.35, {
    transformOrigin: "bottom left",
    rotation: 30,
    x: -9,
    y: -2,
    ease: Power2.easeInOut
  });
}

function closeFingers() {
  TweenMax.to(twoFingers, 0.35, {
    transformOrigin: "bottom left",
    rotation: 0,
    x: 0,
    y: 0,
    ease: Power2.easeInOut
  });
}

function coverEyes() {
  TweenMax.killTweensOf([armL, armR]);
  TweenMax.set([armL, armR], { visibility: "visible" });
  TweenMax.to(armL, 0.45, { x: -93, y: 10, rotation: 0, ease: Quad.easeOut });
  TweenMax.to(armR, 0.45, {
    x: -93,
    y: 10,
    rotation: 0,
    ease: Quad.easeOut,
    delay: 0.1
  });
  mTo(bodyBG, 0.45, { morphSVG: bodyBGchanged, ease: Quad.easeOut });
  eyesCovered = true;
}

function uncoverEyes() {
  TweenMax.killTweensOf([armL, armR]);
  TweenMax.to(armL, 1.35, { y: 220, ease: Quad.easeOut });
  TweenMax.to(armL, 1.35, { rotation: 105, ease: Quad.easeOut, delay: 0.1 });
  TweenMax.to(armR, 1.35, { y: 220, ease: Quad.easeOut });
  TweenMax.to(armR, 1.35, {
    rotation: -105,
    ease: Quad.easeOut,
    delay: 0.1,
    onComplete: function () {
      TweenMax.set([armL, armR], { visibility: "hidden" });
    }
  });
  mTo(bodyBG, 0.45, { morphSVG: bodyBG, ease: Quad.easeOut });
  eyesCovered = false;
}

function resetFace() {
  TweenMax.to([eyeL, eyeR], 1, { x: 0, y: 0, ease: Expo.easeOut });
  TweenMax.to(nose, 1, {
    x: 0,
    y: 0,
    scaleX: 1,
    scaleY: 1,
    ease: Expo.easeOut
  });
  TweenMax.to(mouth, 1, { x: 0, y: 0, rotation: 0, ease: Expo.easeOut });
  TweenMax.to(chin, 1, { x: 0, y: 0, scaleY: 1, ease: Expo.easeOut });
  TweenMax.to([face, eyebrow], 1, { x: 0, y: 0, skewX: 0, ease: Expo.easeOut });
  TweenMax.to([outerEarL, outerEarR, earHairL, earHairR, hair], 1, {
    x: 0,
    y: 0,
    scaleY: 1,
    ease: Expo.easeOut
  });
}

function startBlinking(delay) {
  if (delay) {
    delay = getRandomInt(delay);
  } else {
    delay = 1;
  }
  blinking = TweenMax.to([eyeL, eyeR], 0.1, {
    delay: delay,
    scaleY: 0,
    yoyo: true,
    repeat: 1,
    transformOrigin: "center center",
    onComplete: function () {
      startBlinking(12);
    }
  });
}

function stopBlinking() {
  blinking.kill();
  blinking = null;
  TweenMax.set([eyeL, eyeR], { scaleY: eyeScale });
}

function getRandomInt(max) {
  return Math.floor(Math.random() * Math.floor(max));
}

function getAngle(x1, y1, x2, y2) {
  var angle = Math.atan2(y1 - y2, x1 - x2);
  return angle;
}

function getPosition(el) {
  var xPos = 0;
  var yPos = 0;

  while (el) {
    if (el.tagName == "BODY") {
      // deal with browser quirks with body/window/document and page scroll
      var xScroll = el.scrollLeft || document.documentElement.scrollLeft;
      var yScroll = el.scrollTop || document.documentElement.scrollTop;

      xPos += el.offsetLeft - xScroll + el.clientLeft;
      yPos += el.offsetTop - yScroll + el.clientTop;
    } else {
      // for all other non-BODY elements
      xPos += el.offsetLeft - el.scrollLeft + el.clientLeft;
      yPos += el.offsetTop - el.scrollTop + el.clientTop;
    }

    el = el.offsetParent;
  }
  //console.log("xPos: " + xPos + ", yPos: " + yPos);
  return {
    x: xPos,
    y: yPos
  };
}

function measure() {
  svgCoords = getPosition(mySVG);
  emailCoords = getPosition(email);
  screenCenter = svgCoords.x + mySVG.offsetWidth / 2;
  eyeLCoords = { x: svgCoords.x + 84, y: svgCoords.y + 76 };
  eyeRCoords = { x: svgCoords.x + 113, y: svgCoords.y + 76 };
  noseCoords = { x: svgCoords.x + 97, y: svgCoords.y + 81 };
  mouthCoords = { x: svgCoords.x + 100, y: svgCoords.y + 100 };
  emailScrollMax = email.scrollWidth;
}

function initLoginForm() {
  measure();
  window.addEventListener("resize", measure);
  email.addEventListener("focus", measure);

  // handle events for email input
  email.addEventListener("focus", onEmailFocus);
  email.addEventListener("blur", onEmailBlur);
  email.addEventListener("input", onEmailInput);
  emailLabel.addEventListener("click", onEmailLabelClick);

  // handle events for password input
  password.addEventListener("focus", onPasswordFocus);
  password.addEventListener("blur", onPasswordBlur);
  //passwordLabel.addEventListener('click', onPasswordLabelClick);

  // handle events for password checkbox
  showPasswordCheck.addEventListener("change", onPasswordToggleChange);
  showPasswordCheck.addEventListener("focus", onPasswordToggleFocus);
  showPasswordCheck.addEventListener("blur", onPasswordToggleBlur);
  showPasswordCheck.addEventListener("click", onPasswordToggleClick);
  showPasswordToggle.addEventListener("mouseup", onPasswordToggleMouseUp);
  showPasswordToggle.addEventListener("mousedown", onPasswordToggleMouseDown);

  // move arms to initial positions
  TweenMax.set(armL, {
    x: -93,
    y: 220,
    rotation: 105,
    transformOrigin: "top left"
  });
  TweenMax.set(armR, {
    x: -93,
    y: 220,
    rotation: -105,
    transformOrigin: "top right"
  });

  // set initial mouth property (fixes positioning bug)
  TweenMax.set(mouth, { transformOrigin: "center center" });

  // activate blinking
  startBlinking(5);

  // determine how far email input can go before scrolling occurs
  // will be used as the furthest point avatar will look to the right
  emailScrollMax = email.scrollWidth;

}

try { initLoginForm(); } catch (err) { console.warn("login animasi gagal:", err); }

})();
(function () {
var speed = 0.9;
var WIDTH;
var HEIGHT;
var castleWidth;
var scale;
var control = false;

var progress = 0.0;

var _castleCont = $('.castle-bg .castle-container');
var _castle = $('.castle');

var resize = function() {
    WIDTH = window.innerWidth;
    HEIGHT = window.innerHeight;
    scale = WIDTH / 1440;

    castleWidth = _castle.width() * scale;

    TweenLite.set(_castle, {scale: scale * 0.85});
};
resize();
$(window).on('resize', resize);


var draw = function() {
    requestAnimationFrame(draw);

    progress += 0.0012 * speed;
    if (progress > 1) progress = 0;
    if (progress < 0) progress = 1;

    TweenLite.set(_castleCont, {x: (1440 * scale + castleWidth) * -progress + castleWidth / 2, y: 900 * scale * -(0.36 + progress * 0.35)});
};

if (window.gsap) gsap.defaults({ ease: 'power1.inOut' }); else TweenLite.defaultEase = Power1.easeInOut;

var cloudIntro = function() {
    TweenLite.to($('.cloud1'), 20, {x: WIDTH * 2, y: 300 * scale, opacity: 0.3, ease: Linear.easeNone, force3D: true});
    TweenLite.to($('.cloud-shadow1'), 20, {x: WIDTH * 2 + 50 * scale, y: 450 * scale, opacity: 0.2, ease: Linear.easeNone, force3D: true});
    TweenLite.to($('.cloud-shadow2'), 20, {x: WIDTH * 2 + 50 * scale, y: 450 * scale, ease: Linear.easeNone, force3D: true});
    TweenLite.to($('.cloud-shadow3'), 20, {x: WIDTH * 2 + 50 * scale, y: 450 * scale, ease: Linear.easeNone, force3D: true});
    TweenLite.to($('.cloud2'), 20, {x: WIDTH * 2, y: 300 * scale, opacity: 0.5, ease: Linear.easeNone, force3D: true});
    TweenLite.to($('.cloud3'), 20, {x: WIDTH * 2, y: 300 * scale, ease: Linear.easeNone, force3D: true});
    TweenLite.to($('.cloud4'), 20, {x: WIDTH * 2, y: 300 * scale, ease: Linear.easeNone, force3D: true});
    TweenLite.to($('.cloud5'), 20, {x: WIDTH * 2, y: 300 * scale, ease: Linear.easeNone, force3D: true, onComplete: function() {
        $('.clouds').remove();
    }});
};

var init = function() {
    TweenLite.to($('.load-gate'), 0.5, {opacity: 0, onComplete: function() {
        $('.load-gate').remove();
    }});
    requestAnimationFrame(draw);
    cloudIntro();
};
if (document.readyState == 'complete') {
    init();
} else {
    $(window).on('load', init);
}

TweenMax.to($('.cloud-bg'), 40, {x: WIDTH * 2, y: 200 * scale, ease: Linear.easeNone, repeat: -1, force3D: true, onRepeat: function() {
    TweenLite.set(this.target[0], {y: Math.random() * 200 - 100, rotationZ: Math.round(Math.random() * 60) - 30, scaleX: Math.random() > 0.5 ? 1 : -1});
}});

TweenMax.to($('.cloud-bg2'), 40, {x: WIDTH * 2, y: 200 * scale, ease: Linear.easeNone, delay: 10, repeat: -1, force3D: true, onRepeat: function() {
    TweenLite.set(this.target[0], {y: Math.random() * 200 - 100, rotationZ: Math.round(Math.random() * 60) - 30, scaleX: Math.random() > 0.5 ? 1 : -1});
}});

var tl = new TimelineMax({repeat: -1, onReverseComplete: function() {this.seek(tl.duration())}});

var _flleg = $('.flleg');
var _flbottomGroup = $('.flbottom-group');
var _flfoot = $('.flfoot');

TweenLite.set(_flleg, {rotationZ: 45, x: -5});
TweenLite.set(_flbottomGroup, {rotationZ: 5});
TweenLite.set(_flfoot, {rotationZ: -50});

tl.add([
    TweenLite.to(_flleg, 1.0, {rotationZ: -45, delay: 0.0, force3D: true}),

    TweenLite.to(_flleg, 0.2, {x: 0, delay: 0.0, ease: Power1.easeOut, force3D: true}),

    TweenLite.to(_flleg, 0.55, {scaleY: 0.8, delay: 0.0, force3D: true}),
    TweenLite.to(_flbottomGroup, 0.55, {scaleY: 0.8, delay: 0.0, force3D: true}),
    TweenLite.to(_flbottomGroup, 0.6, {rotationZ: 20, delay: 0.0, ease: Power3.easeIn, force3D: true}),
    TweenLite.to(_flfoot, 0.55, {scaleY: 1.5, delay: 0.0, force3D: true}),
    TweenLite.to(_flfoot, 0.6, {rotationZ: 10, delay: 0.0, ease: Power2.easeIn, force3D: true}),
    
    TweenLite.to(_flleg, 0.4, {scaleY: 1.0, delay: 0.6, force3D: true}),
    TweenLite.to(_flbottomGroup, 0.4, {scaleY: 0.7, delay: 0.6, force3D: true}),
    TweenLite.to(_flbottomGroup, 0.4, {rotationZ: 50, delay: 0.6, force3D: true}),
    TweenLite.to(_flfoot, 0.2, {rotationZ: 10, delay: 0.6, ease: Linear.easeNone, force3D: true}),
    TweenLite.to(_flfoot, 0.2, {rotationZ: -10, delay: 0.8, ease: Power1.easeOut, force3D: true}),
    TweenLite.to(_flfoot, 0.4, {scaleY: 1.5, delay: 0.6, force3D: true}),
    
    TweenLite.to(_flleg, 0.6, {x: 20, delay: 0.7, force3D: true}),

    TweenLite.to(_flleg, 0.5, {rotationZ: 0, delay: 1.0, ease: Power1.easeIn, force3D: true}),
    TweenLite.to(_flleg, 0.5, {scaleY: 0.8, delay: 1.0, force3D: true}),
    TweenLite.to(_flbottomGroup, 0.5, {scaleY: 0.5, delay: 1.0, force3D: true}),
    TweenLite.to(_flfoot, 0.5, {scaleX: 1.8, scaleY: 1.7, delay: 1.0, ease: Power1.easeIn, force3D: true}),
    TweenLite.to(_flbottomGroup, 0.5, {rotationZ: 40, delay: 1.0, force3D: true}),
    TweenLite.to(_flfoot, 0.5, {rotationZ: -70, delay: 1.0, force3D: true}),

    TweenLite.to(_flleg, 0.5, {rotationZ: 45, delay: 1.5, ease: Power1.easeOut, force3D: true}),
    TweenLite.to(_flleg, 0.5, {scaleY: 1.0, delay: 1.5, force3D: true}),
    TweenLite.to(_flbottomGroup, 0.5, {scaleY: 1.0, delay: 1.5, force3D: true}),
    TweenLite.to(_flbottomGroup, 0.5, {rotationZ: 5, delay: 1.5, force3D: true}),
    TweenLite.to(_flfoot, 0.5, {rotationZ: -50, delay: 1.5, force3D: true}),
    TweenLite.to(_flfoot, 0.5, {scaleX: 1.0, scaleY: 1.0, delay: 1.5, force3D: true}),

    TweenLite.to(_flleg, 0.5, {x: -10, delay: 1.3, force3D: true}),

    TweenLite.to(_flleg, 0.2, {x: -5, delay: 1.8, ease: Power1.easeIn, force3D: true}),
]); 

var tl2 = new TimelineMax({repeat: -1, delay: 0.7, onReverseComplete: function() {this.seek(tl2.duration())}});

var _blleg = $('.blleg');
var _blbottomGroup = $('.blbottom-group');
var _blfoot = $('.blfoot');

TweenLite.set(_blleg, {rotationZ: 45, x: -5});
TweenLite.set(_blbottomGroup, {rotationZ: 5});
TweenLite.set(_blfoot, {rotationZ: -50});

tl2.add([
    TweenLite.to(_blleg, 1.0, {rotationZ: -45, delay: 0.0, force3D: true}),

    TweenLite.to(_blleg, 0.2, {x: 0, delay: 0.0, ease: Power1.easeOut, force3D: true}),

    TweenLite.to(_blleg, 0.55, {scaleY: 0.8, delay: 0.0, force3D: true}),
    TweenLite.to(_blbottomGroup, 0.55, {scaleY: 0.8, delay: 0.0, force3D: true}),
    TweenLite.to(_blbottomGroup, 0.6, {rotationZ: 20, delay: 0.0, ease: Power3.easeIn, force3D: true}),
    TweenLite.to(_blfoot, 0.55, {scaleY: 1.5, delay: 0.0, force3D: true}),
    TweenLite.to(_blfoot, 0.6, {rotationZ: 10, delay: 0.0, ease: Power2.easeIn, force3D: true}),
    
    TweenLite.to(_blleg, 0.4, {scaleY: 1.0, delay: 0.6, force3D: true}),
    TweenLite.to(_blbottomGroup, 0.4, {scaleY: 0.7, delay: 0.6, force3D: true}),
    TweenLite.to(_blbottomGroup, 0.4, {rotationZ: 50, delay: 0.6, force3D: true}),
    TweenLite.to(_blfoot, 0.2, {rotationZ: 10, delay: 0.6, ease: Linear.easeNone, force3D: true}),
    TweenLite.to(_blfoot, 0.2, {rotationZ: -10, delay: 0.8, ease: Power1.easeOut, force3D: true}),
    TweenLite.to(_blfoot, 0.4, {scaleY: 1.5, delay: 0.6, force3D: true}),
    
    TweenLite.to(_blleg, 0.6, {x: 20, delay: 0.7, force3D: true}),

    TweenLite.to(_blleg, 0.5, {rotationZ: 0, delay: 1.0, ease: Power1.easeIn, force3D: true}),
    TweenLite.to(_blleg, 0.5, {scaleY: 0.8, delay: 1.0, force3D: true}),
    TweenLite.to(_blbottomGroup, 0.5, {scaleY: 0.5, delay: 1.0, force3D: true}),
    TweenLite.to(_blfoot, 0.5, {scaleX: 1.8, scaleY: 1.7, delay: 1.0, ease: Power1.easeIn, force3D: true}),
    TweenLite.to(_blbottomGroup, 0.5, {rotationZ: 40, delay: 1.0, force3D: true}),
    TweenLite.to(_blfoot, 0.5, {rotationZ: -70, delay: 1.0, force3D: true}),

    TweenLite.to(_blleg, 0.5, {rotationZ: 45, delay: 1.5, ease: Power1.easeOut, force3D: true}),
    TweenLite.to(_blleg, 0.5, {scaleY: 1.0, delay: 1.5, force3D: true}),
    TweenLite.to(_blbottomGroup, 0.5, {scaleY: 1.0, delay: 1.5, force3D: true}),
    TweenLite.to(_blbottomGroup, 0.5, {rotationZ: 5, delay: 1.5, force3D: true}),
    TweenLite.to(_blfoot, 0.5, {rotationZ: -50, delay: 1.5, force3D: true}),
    TweenLite.to(_blfoot, 0.5, {scaleX: 1.0, scaleY: 1.0, delay: 1.5, force3D: true}),

    TweenLite.to(_blleg, 0.5, {x: -10, delay: 1.3, force3D: true}),

    TweenLite.to(_blleg, 0.2, {x: -5, delay: 1.8, ease: Power1.easeIn, force3D: true}),
]);



var tl3 = new TimelineMax({repeat: -1, delay: 1.0, onReverseComplete: function() {this.seek(tl3.duration())}});

var _frleg = $('.frleg');
var _frfoot = $('.frfoot');

TweenLite.set(_frleg, {rotationZ: 35, x: -40});
TweenLite.set(_frfoot, {rotationZ: -35});

tl3.add([
    TweenLite.to(_frleg, 0.9, {rotationZ: -35, delay: 0.0, force3D: true}),
    TweenLite.to(_frleg, 1.2, {x: 40, delay: 0.0, ease: Power1.easeOut, force3D: true}),

    TweenLite.to(_frfoot, 0.9, {rotationZ: 35, delay: 0.0, force3D: true}),
    
    TweenLite.to(_frleg, 0.4, {y: -15, delay: 0.0, ease: Power1.easeIn, force3D: true}),
    TweenLite.to(_frleg, 0.4, {y: 0, delay: 0.5, ease: Power1.easeOut, force3D: true}),

    TweenLite.to(_frleg, 1.1, {rotationZ: 35, delay: 0.9, force3D: true}),
    TweenLite.to(_frleg, 0.6, {x: -50, delay: 1.2, force3D: true}),
    
    TweenLite.to(_frfoot, 0.5, {rotationZ: -50, delay: 0.9, force3D: true}),
    TweenLite.to(_frfoot, 0.3, {rotationZ: -35, delay: 1.7, force3D: true}),

    TweenLite.to(_frleg, 0.6, {y: -40, delay: 0.9, force3D: true}),
    TweenLite.to(_frleg, 0.5, {y: 0, delay: 1.5, force3D: true}),
    
    TweenLite.to(_frleg, 0.2, {x: -40, delay: 1.8, ease: Power1.easeIn, force3D: true}),
]);


var tl4 = new TimelineMax({repeat: -1, delay: 1.7, onReverseComplete: function() {this.seek(tl4.duration())}});

var _brleg = $('.brleg');
var _brfoot = $('.brfoot');

TweenLite.set(_brleg, {rotationZ: 35, x: -40});
TweenLite.set(_brfoot, {rotationZ: -35});

tl4.add([
    TweenLite.to(_brleg, 0.9, {rotationZ: -35, delay: 0.0, force3D: true}),
    TweenLite.to(_brleg, 1.2, {x: 40, delay: 0.0, ease: Power1.easeOut, force3D: true}),

    TweenLite.to(_brfoot, 0.9, {rotationZ: 35, delay: 0.0, force3D: true}),
    
    TweenLite.to(_brleg, 0.4, {y: -15, delay: 0.0, ease: Power1.easeIn, force3D: true}),
    TweenLite.to(_brleg, 0.4, {y: 0, delay: 0.5, ease: Power1.easeOut, force3D: true}),

    TweenLite.to(_brleg, 1.1, {rotationZ: 35, delay: 0.9, force3D: true}),
    TweenLite.to(_brleg, 0.6, {x: -50, delay: 1.2, force3D: true}),
    
    TweenLite.to(_brfoot, 0.5, {rotationZ: -50, delay: 0.9, force3D: true}),
    TweenLite.to(_brfoot, 0.3, {rotationZ: -35, delay: 1.7, force3D: true}),

    TweenLite.to(_brleg, 0.6, {y: -40, delay: 0.9, force3D: true}),
    TweenLite.to(_brleg, 0.5, {y: 0, delay: 1.5, force3D: true}),
    
    TweenLite.to(_brleg, 0.2, {x: -40, delay: 1.8, ease: Power1.easeIn, force3D: true}),
]);


var tl5 = new TimelineMax({repeat: -1, delay: 0.0, onReverseComplete: function() {this.seek(tl5.duration())}});
var _castle = $('.castle');
TweenLite.set(_castle, {rotationZ: 9});
tl5.add([
    TweenLite.to(_castle, 1.0, {rotationZ: 7, delay: 0.0, force3D: true}),
    TweenLite.to(_castle, 1.0, {rotationZ: 9, delay: 1.0, force3D: true}),
    
    TweenLite.to(_castle, 0.5, {x: '+=' + 2 * scale, y: '-=' + 4 * scale, delay: 0.0, force3D: true}),
    TweenLite.to(_castle, 0.5, {x: '-=' + 4 * scale, y: '+=' + 4 * scale, delay: 0.5, force3D: true}),
    TweenLite.to(_castle, 0.5, {x: '+=' + 4 * scale, y: '-=' + 5 * scale, delay: 1.0, force3D: true}),
    TweenLite.to(_castle, 0.5, {x: '-=' + 2 * scale, y: '+=' + 5 * scale, delay: 1.5, force3D: true}),
]);

var tl6 = new TimelineMax({repeat: -1, delay: 0.2});
var _mound = $('.mound-group');
TweenLite.set(_mound, {rotationZ: 2});
tl6.add([
    TweenLite.to(_mound, 1.0, {rotationZ: -1, delay: 0.0, force3D: true}),
    TweenLite.to(_mound, 1.0, {rotationZ: 2, delay: 1.0, force3D: true}),
]);

var tl7 = new TimelineMax({repeat: -1, delay: 0.8});
var _wing = $('.wing');
TweenLite.set(_wing, {rotationZ: 2});
tl7.add([
    TweenLite.to(_wing, 1.0, {rotationZ: -1, x: -5, delay: 0.0, force3D: true}),
    TweenLite.to(_wing, 1.0, {rotationZ: 2, x: 0, delay: 1.0, force3D: true}),
]);

var tl8 = new TimelineMax({repeat: -1, delay: 0.0});
var _chimney1 = $('.chimney1');
TweenLite.set(_chimney1, {rotationZ: -10});
tl8.add([
    TweenLite.to(_chimney1, 1.5, {rotationZ: 5, delay: 0.0, force3D: true}),
    
    TweenLite.to(_chimney1, 1.5, {rotationZ: -10, delay: 1.5, force3D: true}),

    TweenLite.to(_chimney1, 0.5, {y: 5, x: 0, delay: 0.1, force3D: true}),
    TweenLite.to(_chimney1, 0.1, {y: -15, x: 4, delay: 0.6, ease: Power1.easeOut, force3D: true}),
    TweenLite.to(_chimney1, 0.9, {y: 0, x: 0, delay: 0.7, force3D: true}),

    TweenLite.to(_chimney1, 0.5, {y: 5, x: 0, delay: 1.6, force3D: true}),
    TweenLite.to(_chimney1, 0.1, {y: -15, x: 4, delay: 2.1, ease: Power1.easeOut, force3D: true}),
    TweenLite.to(_chimney1, 0.5, {y: 0, x: 0, delay: 2.2, force3D: true}),
]);

var tl9 = new TimelineMax({repeat: -1, delay: 0.5});
var _chimney2 = $('.chimney2');
TweenLite.set(_chimney2, {rotationZ: -10});
tl9.add([
    TweenLite.to(_chimney2, 1.5, {rotationZ: 5, delay: 0.0, force3D: true}),
    
    TweenLite.to(_chimney2, 1.5, {rotationZ: -10, delay: 1.5, force3D: true}),

    TweenLite.to(_chimney2, 0.5, {y: 5, x: 0, delay: 0.1, force3D: true}),
    TweenLite.to(_chimney2, 0.1, {y: -15, x: 4, delay: 0.6, ease: Power1.easeOut, force3D: true}),
    TweenLite.to(_chimney2, 0.9, {y: 0, x: 0, delay: 0.7, force3D: true}),

    TweenLite.to(_chimney2, 0.5, {y: 5, x: 0, delay: 1.6, force3D: true}),
    TweenLite.to(_chimney2, 0.1, {y: -15, x: 4, delay: 2.1, ease: Power1.easeOut, force3D: true}),
    TweenLite.to(_chimney2, 0.5, {y: 0, x: 0, delay: 2.2, force3D: true}),
]);

var tl10 = new TimelineMax({repeat: -1, delay: 1.1});
var _chimney3 = $('.chimney3');
TweenLite.set(_chimney3, {rotationZ: -10});
tl10.add([
    TweenLite.to(_chimney3, 1.5, {rotationZ: 5, delay: 0.0, force3D: true}),
    
    TweenLite.to(_chimney3, 1.5, {rotationZ: -10, delay: 1.5, force3D: true}),

    TweenLite.to(_chimney3, 0.5, {y: 5, x: 0, delay: 0.1, force3D: true}),
    TweenLite.to(_chimney3, 0.1, {y: -15, x: 4, delay: 0.6, ease: Power1.easeOut, force3D: true}),
    TweenLite.to(_chimney3, 0.9, {y: 0, x: 0, delay: 0.7, force3D: true}),

    TweenLite.to(_chimney3, 0.5, {y: 5, x: 0, delay: 1.6, force3D: true}),
    TweenLite.to(_chimney3, 0.1, {y: -15, x: 4, delay: 2.1, ease: Power1.easeOut, force3D: true}),
    TweenLite.to(_chimney3, 0.5, {y: 0, x: 0, delay: 2.2, force3D: true}),
]);

var tl11 = new TimelineMax({repeat: -1, delay: 0.5});
var _houses = $('.houses-group');
var _point1 = $('.point1');
var _point2 = $('.point2');
TweenLite.set(_houses, {rotationZ: 2, x: -4});
TweenLite.set(_point1, {rotationZ: 2, x: -2});
tl11.add([
    TweenLite.to(_houses, 1.0, {rotationZ: -1, y: 5, x: 0, delay: 0.0, force3D: true}),
    TweenLite.to(_houses, 1.0, {rotationZ: 2, y: 0, x: -4, delay: 1.0, force3D: true}),

    TweenLite.to(_point1, 1.0, {rotationZ: -10, y: 2, x: 0, delay: 0.0, force3D: true}),
    TweenLite.to(_point1, 1.0, {rotationZ: 2, y: 0, x: -2, delay: 1.0, force3D: true}),

    TweenLite.to(_point2, 1.0, {rotationZ: -5, y: 5, x: 2, delay: 0.0, force3D: true}),
    TweenLite.to(_point2, 1.0, {rotationZ: 0, y: 0, x: 0, delay: 1.0, force3D: true}),
]);

var tl12 = new TimelineMax({repeat: -1, delay: 0.45});
var _point4 = $('.point4');
var _point5 = $('.point5');
var _point6 = $('.point6');
tl12.add([
    TweenLite.to(_point6, 0.3, {y: 3, delay: 0.0, force3D: true}),
    TweenLite.to(_point6, 0.1, {y: -10, x: 4, delay: 0.3, force3D: true}),
    TweenLite.to(_point6, 0.9, {y: 0, x: 0, delay: 0.4, force3D: true}),

    TweenLite.to(_point5, 0.3, {y: 3, delay: 0.2, force3D: true}),
    TweenLite.to(_point5, 0.1, {y: -7, x: 3, delay: 0.5, force3D: true}),
    TweenLite.to(_point5, 0.7, {y: 0, x: 0, delay: 0.6, force3D: true}),

    TweenLite.to(_point4, 0.3, {y: 3, delay: 0.4, force3D: true}),
    TweenLite.to(_point4, 0.1, {y: -10, x: 4, delay: 0.7, force3D: true}),
    TweenLite.to(_point4, 0.7, {y: 0, x: 0, delay: 0.8, force3D: true}),
]);

var tl13 = new TimelineMax({repeat: -1, delay: 1.4});
var _treehouse = $('.treehouse');
TweenLite.set(_treehouse, {rotationZ: -5, y: 20, x: 4});
tl13.add([
    TweenLite.to(_treehouse, 1.0, {rotationZ: 10, delay: 0.0, force3D: true}),
    TweenLite.to(_treehouse, 1.0, {rotationZ: -5, delay: 1.0, force3D: true}),
    TweenLite.to(_treehouse, 1.0, {rotationZ: 10, delay: 2.0, force3D: true}),
    TweenLite.to(_treehouse, 1.0, {rotationZ: -5, delay: 3.0, force3D: true}),
    
    TweenLite.to(_treehouse, 0.4, {y: -5, x: -2, delay: 0.2, force3D: true}),
    TweenLite.to(_treehouse, 3.2, {y: 20, x: 4, delay: 0.8, force3D: true}),
]);

var tl14 = new TimelineMax({repeat: -1, delay: 0.65});
var _wind = $('.wind');
var _antenna = $('.antenna');
var _cannon = $('.cannon');
var _tele = $('.tele');
var _knob = $('.knob');
TweenLite.set(_antenna, {rotationZ: 10, x: 0});
TweenLite.set(_wind, {rotationZ: -10, x: 0});
TweenLite.set(_knob, {rotationZ: -20, x: 0});
tl14.add([
    TweenLite.to(_antenna, 1.0, {rotationZ: -5, x: 0, delay: 0.0, force3D: true}),
    TweenLite.to(_antenna, 1.0, {rotationZ: 10, x: 5, delay: 1.0, force3D: true}),
    TweenLite.to(_antenna, 1.0, {rotationZ: -10, x: -5, delay: 2.0, force3D: true}),
    TweenLite.to(_antenna, 1.0, {rotationZ: 10, x: 0, delay: 3.0, force3D: true}),

    TweenLite.to(_wind, 1.1, {rotationZ: 5, delay: 0.0, force3D: true}),
    TweenLite.to(_wind, 1.0, {rotationZ: -15, delay: 1.1, force3D: true}),
    TweenLite.to(_wind, 1.0, {rotationZ: 10, delay: 2.1, force3D: true}),
    TweenLite.to(_wind, 0.9, {rotationZ: -10, delay: 3.1, force3D: true}),

    TweenLite.to(_knob, 0.2, {rotationZ: 50, delay: 0.0, force3D: true}),
    TweenLite.to(_knob, 0.2, {rotationZ: -20, delay: 0.3, force3D: true}),
    TweenLite.to(_knob, 0.2, {rotationZ: 45, delay: 0.7, force3D: true}),
    TweenLite.to(_knob, 0.2, {rotationZ: -25, delay: 1.0, force3D: true}),
    TweenLite.to(_knob, 0.2, {rotationZ: 30, delay: 1.5, force3D: true}),
    TweenLite.to(_knob, 0.2, {rotationZ: 0, delay: 1.9, force3D: true}),
    TweenLite.to(_knob, 0.2, {rotationZ: -20, delay: 2.2, force3D: true}),
    TweenLite.to(_knob, 0.3, {rotationZ: 60, delay: 2.6, force3D: true}),
    TweenLite.to(_knob, 0.2, {rotationZ: -10, delay: 3.0, force3D: true}),
    TweenLite.to(_knob, 0.2, {rotationZ: 40, delay: 3.4, force3D: true}),
    TweenLite.to(_knob, 0.2, {rotationZ: -20, delay: 3.7, force3D: true}),
    
    TweenLite.to(_tele, 1.0, {rotationZ: -3, delay: 0.0, force3D: true}),
    TweenLite.to(_tele, 1.0, {rotationZ: 2, delay: 1.0, force3D: true}),
    TweenLite.to(_tele, 1.0, {rotationZ: -3, delay: 2.0, force3D: true}),
    TweenLite.to(_tele, 1.0, {rotationZ: 0, delay: 3.0, force3D: true}),

    TweenLite.to(_tele, 0.25, {x: 25, y: 4, delay: 0.6, force3D: true}),
    TweenLite.to(_tele, 2.5, {x: 0, y: 0, delay: 0.9, force3D: true}),

    TweenLite.to(_cannon, 0.9, {rotationZ: -7, delay: 0.0, force3D: true}),
    TweenLite.to(_cannon, 0.9, {rotationZ: 2, delay: 0.9, force3D: true}),
    TweenLite.to(_cannon, 1.1, {rotationZ: -5, delay: 1.8, force3D: true}),
    TweenLite.to(_cannon, 1.1, {rotationZ: 0, delay: 2.9, force3D: true}),

    TweenLite.to(_cannon, 0.25, {x: 30, y: 4, delay: 0.85, force3D: true}),
    TweenLite.to(_cannon, 2.6, {x: 0, y: 0, delay: 1.4, force3D: true}),
]);
})();
})();