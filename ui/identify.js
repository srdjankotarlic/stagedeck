const params=new URLSearchParams(location.search);document.getElementById('number').textContent=params.get('number');document.getElementById('label').textContent=params.get('label');
