window.addEventListener('load', () => {
    init();
});

function init() {

    let input = document.querySelector('input');

    let viewCard = document.querySelector('.viewCard');
    viewCard.addEventListener('click', () => {
        showCard(input.value);
    });

    let shareCard = document.querySelector('.shareCard');
    shareCard.addEventListener('click', () => {
        shareTwitter(input.value);
    });
}

function showCard(name) {
    window.location.assign(`http://www.christmascard.cloud/card.html?name=${name}`);
}

function shareTwitter(name) {
    console.log(name);
    let url = `http://www.christmascard.cloud/card.html?name=${name}`;
    let twitterText = "Here's a #ChristmasCard.Cloud I made";
    window.open('http://twitter.com/intent/tweet?url='+encodeURIComponent(url)+'&text='+encodeURIComponent(twitterText), '', 'left=0,top=0,width=550,height=450,personalbar=0,toolbar=0,scrollbars=0,resizable=0');
}

